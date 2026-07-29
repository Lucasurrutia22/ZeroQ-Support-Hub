import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { askAISchema } from "@/lib/schemas/ai";
import { askAI } from "@/modules/search-ai/application/use-cases/ask-ai";

// Route Handler (no Server Action): consumido desde un Client Component
// (el chat necesita interactividad — enviar mensaje, mostrar "escribiendo…")
// — regla de ARCHITECTURE.md §7. `proxy.ts` excluye "/api/**" de su matcher,
// así que esta ruta valida su propia sesión explícitamente (no asumir que el
// middleware ya filtró, a diferencia de Server Actions dentro de (dashboard)).
const STATUS_BY_ERROR_CODE: Record<string, number> = {
  forbidden: 403,
  empty_query: 400,
  not_found: 404,
  untraceable_answer: 422,
};

export async function POST(request: Request) {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let input: ReturnType<typeof askAISchema.parse>;
  try {
    input = askAISchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    throw error;
  }

  // askAI puede lanzar (no devolver un Result) cuando falla una dependencia
  // externa — EmbeddingProvider (Voyage) o LLMProvider — porque son fallos
  // de infraestructura, no errores de negocio (ARCHITECTURE.md §8). Sin este
  // try/catch, esa excepción se propaga como un 500 crudo de Next.js en vez
  // de un JSON claro que la UI del chat pueda mostrar.
  try {
    const result = await askAI(actingUser, input);
    if (!result.ok) {
      const status = STATUS_BY_ERROR_CODE[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json({
      conversationId: result.value.conversationId,
      message: result.value.assistantMessage,
    });
  } catch {
    return NextResponse.json(
      {
        error: "ai_provider_unavailable",
        message:
          "El asistente de IA no está disponible en este momento (proveedor de embeddings o LLM inaccesible). Intenta de nuevo en unos minutos.",
      },
      { status: 502 },
    );
  }
}
