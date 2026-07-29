import {
  embeddingProvider,
  sourceMetadataReader,
  vectorStore,
} from "../../infrastructure/container";
import type { RankedChunk, SearchFilters } from "../../domain/types";

// UC-AI-01 (USE_CASES.md) — buscador híbrido, disponible para todos los
// roles incluido Solo Lectura (canSearch, sin restricción). También es la
// base del retrieval que consume AskAIUseCase (UC-AI-02).
export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  topK = 8,
): Promise<RankedChunk[]> {
  const queryEmbedding = await embeddingProvider.embed(query, "query");

  const scored = await vectorStore.hybridSearch({
    queryEmbedding,
    queryText: query,
    topK,
    filters,
  });

  const metadata = await sourceMetadataReader.resolveMany(
    scored.map((chunk) => ({ sourceType: chunk.sourceType, sourceId: chunk.sourceId })),
  );

  return scored
    .map((chunk) => {
      const meta = metadata.get(`${chunk.sourceType}:${chunk.sourceId}`);
      // Edge case raro: el Procedure/ResolvedCase fue borrado entre
      // indexación y consulta — se omite en vez de mostrar una cita rota.
      if (!meta) return null;
      return {
        ...chunk,
        citationTag: meta.citationTag,
        sourceTitle: meta.title,
        entityId: meta.entityId,
        entityUrl: meta.entityUrl,
      };
    })
    .filter((chunk): chunk is RankedChunk => chunk !== null);
}
