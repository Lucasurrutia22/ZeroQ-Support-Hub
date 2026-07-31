import { APICallError, generateText, isStepCount, Output, tool, type LanguageModel } from "ai";
import { z } from "zod";
import type {
  GenerateAnswerInput,
  LLMProvider,
  SummarizeDocumentInput,
  SummarizeDocumentOutput,
} from "@/modules/search-ai/domain/ports";
import { webSearchProvider } from "@/modules/search-ai/infrastructure/container";

// Instrucciones para la ingesta automática de Documentación → Bitácora
// (documents/actions.ts → bitacora-auto-ingest.ts): un solo turno, sin
// tools, sin salida estructurada — el documento ya es la única fuente, no
// hace falta el aparato de citas/RAG del chat. Le pide explícitamente que
// use bloques de código para comandos porque `command-annotations.ts` (guía
// "dónde ejecutar cada comando" de Procedimientos) parsea Markdown en busca
// de fences, no de texto libre.
const SUMMARIZE_DOCUMENT_INSTRUCTIONS = `Eres un ingeniero de soporte técnico que convierte manuales/documentos técnicos en una entrada de Bitácora clara y accionable, en español.

Reglas:
- Basate únicamente en el texto provisto. Nunca inventes pasos, comandos o datos que no estén en el documento.
- Si el documento no tiene procedimientos operativos claros (es solo información de referencia), igual generá un resumen útil de su contenido.
- Formato Markdown plano (sin HTML). Estructura sugerida:
  ## Resumen
  1-3 frases con el propósito del documento.
  ## Procedimiento
  Pasos numerados si el documento describe una secuencia de acciones. Cualquier comando literal (shell, SQL, etc.) va en un bloque de código con triple backtick.
  ## Notas
  Advertencias, prerrequisitos o datos importantes mencionados en el documento (opcional, omitir la sección si no aplica).
- Sé conciso: preferí una lista clara antes que párrafos largos.`;

// Salida estructurada obligatoria (AI_RAG_DESIGN.md §4.2) — el mismo schema
// sin importar qué LanguageModel esté detrás (Claude/OpenAI/Ollama/Azure
// OpenAI). "output: Output.object" es la forma vigente en AI SDK v7 de pedir
// JSON tipado (generateObject/streamObject quedaron deprecados en v7 a favor
// de generateText/streamText + output, verificado con Context7 antes de
// escribir esto).
const askAIOutputSchema = z.object({
  answer: z.string(),
  applicableProcedures: z.array(
    z.object({ sourceRef: z.string(), title: z.string() }),
  ),
  commands: z.array(z.string()),
  warnings: z.array(z.string()),
  externalSources: z.array(z.object({ url: z.string(), title: z.string() })),
  riskLevel: z.enum(["low", "medium", "high"]).nullable(),
  estimatedTimeMinutes: z.number().nullable(),
  hasSufficientContext: z.boolean(),
});

// Máximo de pasos del loop agéntico: 1 llamada a la tool de búsqueda + 1
// procesamiento del resultado + 1 salida estructurada final, con margen para
// que el modelo busque dos veces si lo necesita (confirmado con la
// documentación vigente del AI SDK que "tools" + "output: Output.object" se
// combinan en la misma llamada a generateText, sumando 1 paso extra al
// stopWhen por la generación de salida estructurada).
const MAX_AGENT_STEPS = 5;

// Verificado en vivo (2026-07-31) con Groq (gpt-oss-20b): el tool-calling
// combinado con salida estructurada puede fallar de dos formas — (a) un 400
// directo si el proveedor no soporta combinar `tools` con `response_format:
// json_schema` en la misma llamada ("json mode cannot be combined with
// tool/function calling"), o (b) el modelo genera argumentos de la tool con
// JSON inválido de forma intermitente ("Failed to parse tool call
// arguments", code "tool_use_failed") — esto último no es determinístico,
// le pasó a una consulta con texto acentuado y no a otra idéntica en texto
// plano. Anthropic/OpenAI/Azure no mostraron ninguno de los dos en las
// pruebas de este proyecto. Se trata cualquier `APICallError` 400 del
// proveedor como señal de "el tool-calling no está andando ahora" en vez de
// intentar distinguir el motivo exacto por mensaje.
function isToolCallingFailure(error: unknown): boolean {
  return APICallError.isInstance(error) && error.statusCode === 400;
}

// Adapter único para los 4 proveedores pedidos (Claude, OpenAI, Ollama,
// Azure OpenAI): los cuatro exponen un `LanguageModel` (spec LanguageModelV2
// de @ai-sdk/provider) intercambiable para generateText/streamText — no
// hace falta una clase por proveedor, el swap es 100% responsabilidad de
// qué `LanguageModel` construye la factory (ver llm-provider-factory.ts),
// nunca de este adapter.
export class VercelAiLLMProvider implements LLMProvider {
  constructor(private readonly model: LanguageModel) {}

  async generateAnswer(input: GenerateAnswerInput) {
    const contextBlock = input.chunks.length
      ? input.chunks
          .map(
            (chunk) =>
              `[${chunk.citationTag}] (${chunk.sourceTitle})\n${chunk.content}`,
          )
          .join("\n\n---\n\n")
      : "(sin fragmentos recuperados — no hay contenido relevante en la base de conocimiento)";

    const historyBlock = input.history
      .map(
        (turn) =>
          `${turn.role === "user" ? "Técnico" : "Asistente"}: ${turn.content}`,
      )
      .join("\n");

    const prompt = [
      historyBlock ? `Historial de la conversación:\n${historyBlock}` : null,
      `Fragmentos de contexto recuperados:\n${contextBlock}`,
      `Pregunta del técnico: ${input.query}`,
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");

    // URLs realmente devueltas por la tool en esta llamada — el LLM puede
    // "citar" una URL en `externalSources` sin haberla visto de verdad
    // (alucinación), así que solo se confía en la que de verdad vino de un
    // resultado de búsqueda real (mismo criterio anti-alucinación que las
    // citas internas en ask-ai.ts, aplicado acá porque solo este adapter
    // tiene visibilidad de los resultados reales de la tool).
    const realWebResultUrls = new Set<string>();

    const tools = {
      buscar_en_internet: tool({
        description:
          "Busca en internet cuando los fragmentos de contexto interno no cubren la pregunta del técnico. Úsala solo como último recurso, después de intentar responder con el contexto interno.",
        inputSchema: z.object({
          query: z.string().describe("Consulta de búsqueda, en español o inglés según corresponda."),
        }),
        execute: async ({ query }: { query: string }) => {
          try {
            const results = await webSearchProvider.search(query, 5);
            results.forEach((result) => realWebResultUrls.add(result.url));
            return { results };
          } catch {
            // Tavily caído/rate-limited no debe tumbar toda la respuesta —
            // el modelo sigue pudiendo responder solo con contexto interno.
            return { error: "La búsqueda web no está disponible en este momento." };
          }
        },
      }),
    };

    let output: z.infer<typeof askAIOutputSchema> | undefined;

    try {
      const result = await generateText({
        model: this.model,
        instructions: input.systemPrompt,
        prompt,
        tools,
        stopWhen: isStepCount(MAX_AGENT_STEPS),
        output: Output.object({ schema: askAIOutputSchema }),
      });
      output = result.output;
    } catch (error) {
      if (!isToolCallingFailure(error)) throw error;

      // Degrada a responder solo con el contexto interno ya recuperado, sin
      // ofrecer la tool de búsqueda web — es una pérdida de funcionalidad
      // aceptable (la búsqueda web ya es "último recurso" por diseño, regla
      // 2 del SYSTEM_PROMPT en ask-ai.ts) preferible a que la pregunta
      // entera falle por un problema del proveedor con el tool-calling.
      //
      // El SYSTEM_PROMPT original menciona la tool "buscar_en_internet" por
      // nombre (reglas 2 y 6) — algunos modelos (confirmado con gpt-oss-20b
      // en Groq) intentan invocarla igual aunque no esté registrada en esta
      // llamada, causando el mismo error. Se anexa un aviso que anula esas
      // reglas para este intento en particular.
      const fallbackInstructions = `${input.systemPrompt}\n\nAVISO PARA ESTE INTENTO: no tenés ninguna herramienta disponible (ni "buscar_en_internet" ni ninguna otra) — no intentes invocar ninguna. Respondé directamente en el JSON solicitado usando solo los fragmentos de contexto interno de arriba; si no alcanzan, marcá "hasSufficientContext" en false y decilo en "answer" en vez de intentar buscar en internet.`;

      const fallbackResult = await generateText({
        model: this.model,
        instructions: fallbackInstructions,
        prompt,
        output: Output.object({ schema: askAIOutputSchema }),
      });
      output = fallbackResult.output;
    }

    if (!output) {
      throw new Error(
        "El proveedor de IA activo no devolvió una respuesta estructurada válida.",
      );
    }

    return {
      ...output,
      externalSources: output.externalSources.filter((source) =>
        realWebResultUrls.has(source.url),
      ),
    };
  }

  async summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
    const { text } = await generateText({
      model: this.model,
      instructions: SUMMARIZE_DOCUMENT_INSTRUCTIONS,
      prompt: `Título del documento: ${input.title}\n\nTexto extraído del documento:\n${input.rawText}`,
    });

    return { contentMarkdown: text.trim() };
  }
}
