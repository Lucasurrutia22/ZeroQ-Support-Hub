import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { searchQuerySchema } from "@/lib/schemas/ai";
import { semanticSearch } from "@/modules/search-ai/application/use-cases/semantic-search";
import { canSearch } from "@/modules/search-ai/application/policies";

// UC-AI-01 — todos los roles incluido Solo Lectura (canSearch no restringe
// ninguno, a diferencia de /api/ai/chat). GET con query params: es una
// operación de solo lectura, sin efectos secundarios que ameriten POST.
export async function GET(request: Request) {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!canSearch(actingUser.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  let input: ReturnType<typeof searchQuerySchema.parse>;
  try {
    input = searchQuerySchema.parse({
      q: searchParams.get("q"),
      categoryId: searchParams.get("categoryId") ?? undefined,
      clientId: searchParams.get("clientId") ?? undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    throw error;
  }

  // semanticSearch puede lanzar si el EmbeddingProvider (Voyage) falla —
  // fallo de infraestructura (ARCHITECTURE.md §8), no de negocio. Sin este
  // try/catch se propaga como 500 crudo de Next.js.
  try {
    const results = await semanticSearch(input.q, {
      categoryId: input.categoryId,
      clientId: input.clientId,
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      {
        error: "search_unavailable",
        message:
          "El buscador no está disponible en este momento (proveedor de embeddings inaccesible). Intenta de nuevo en unos minutos.",
      },
      { status: 502 },
    );
  }
}
