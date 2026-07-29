import { generateText, isStepCount, Output, tool, type LanguageModel } from "ai";
import { z } from "zod";
import type {
  GenerateAnswerInput,
  LLMProvider,
} from "@/modules/search-ai/domain/ports";
import { webSearchProvider } from "@/modules/search-ai/infrastructure/container";

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

    const { output } = await generateText({
      model: this.model,
      instructions: input.systemPrompt,
      prompt,
      tools: {
        buscar_en_internet: tool({
          description:
            "Busca en internet cuando los fragmentos de contexto interno no cubren la pregunta del técnico. Úsala solo como último recurso, después de intentar responder con el contexto interno.",
          inputSchema: z.object({
            query: z.string().describe("Consulta de búsqueda, en español o inglés según corresponda."),
          }),
          execute: async ({ query }) => {
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
      },
      stopWhen: isStepCount(MAX_AGENT_STEPS),
      output: Output.object({ schema: askAIOutputSchema }),
    });

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
}
