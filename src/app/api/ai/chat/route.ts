import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { askAISchema } from "@/lib/schemas/ai";
import { prepareAskAI, completeAskAI } from "@/modules/search-ai/application/use-cases/ask-ai";

// Route Handler (no Server Action): consumido desde un Client Component
// (el chat necesita interactividad — enviar mensaje, mostrar "escribiendo…")
// — regla de ARCHITECTURE.md §7. `proxy.ts` excluye "/api/**" de su matcher,
// así que esta ruta valida su propia sesión explícitamente (no asumir que el
// middleware ya filtró, a diferencia de Server Actions dentro de (dashboard)).
//
// Streaming NDJSON (una línea JSON por evento) en vez de un solo
// NextResponse.json — revisita a propósito la decisión original de "sin
// streaming en este alcance" (ver AI_RAG_DESIGN.md): es la única forma de
// avisarle al usuario "esto necesita más análisis" ANTES de que termine la
// llamada lenta al LLM, no después. Fases: prepareAskAI (rápida — retrieval +
// clasificación + lookup de memoria semántica) emite un evento "status" de
// inmediato; completeAskAI (lenta si no hubo hit de caché) emite el evento
// final "answer".
const STATUS_BY_ERROR_CODE: Record<string, number> = {
  forbidden: 403,
  empty_query: 400,
  not_found: 404,
  untraceable_answer: 422,
};

function ndjsonLine(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request: Request) {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let input: ReturnType<typeof askAISchema.parse>;
  try {
    input = askAISchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw error;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // askAI puede lanzar (no devolver un Result) cuando falla una
      // dependencia externa — EmbeddingProvider (Voyage) o LLMProvider —
      // porque son fallos de infraestructura, no errores de negocio
      // (ARCHITECTURE.md §8). Sin este try/catch, esa excepción cortaría el
      // stream sin que el cliente reciba un evento "error" legible.
      try {
        const prepared = await prepareAskAI(actingUser, input);
        if (!prepared.ok) {
          const status = STATUS_BY_ERROR_CODE[prepared.error.code] ?? 500;
          controller.enqueue(
            ndjsonLine({ type: "error", error: prepared.error.code, message: prepared.error.message, status }),
          );
          controller.close();
          return;
        }

        controller.enqueue(
          ndjsonLine({
            type: "status",
            confidence: prepared.value.confidence,
            origin: prepared.value.cachedAnswer ? "cache" : null,
          }),
        );

        const result = await completeAskAI(actingUser, prepared.value);
        if (!result.ok) {
          const status = STATUS_BY_ERROR_CODE[result.error.code] ?? 500;
          controller.enqueue(
            ndjsonLine({ type: "error", error: result.error.code, message: result.error.message, status }),
          );
          controller.close();
          return;
        }

        controller.enqueue(
          ndjsonLine({
            type: "answer",
            conversationId: result.value.conversationId,
            message: result.value.assistantMessage,
          }),
        );
        controller.close();
      } catch {
        controller.enqueue(
          ndjsonLine({
            type: "error",
            error: "ai_provider_unavailable",
            message:
              "El asistente de IA no está disponible en este momento (proveedor de embeddings o LLM inaccesible). Intenta de nuevo en unos minutos.",
            status: 502,
          }),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
