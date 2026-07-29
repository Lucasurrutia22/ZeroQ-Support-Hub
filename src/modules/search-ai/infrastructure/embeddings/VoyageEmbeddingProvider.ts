import { voyage } from "@ai-sdk/voyage";
import { embed, embedMany } from "ai";
import type {
  EmbeddingInputType,
  EmbeddingProvider,
} from "@/modules/search-ai/domain/ports";

// D2 (AI_RAG_DESIGN.md §2, cerrado con el usuario): Voyage AI, 1024 dims por
// defecto — coincide exactamente con la columna halfvec(1024) de
// DocumentChunk, sin truncation. Fijo, no swappable por config (a
// diferencia del LLMProvider) — cambiar de proveedor de embeddings implica
// re-embeber todo el corpus, es una decisión de una sola vez.
//
// Modelo voyage-4-lite (no voyage-3.5, el default original): verificado
// contra la documentación vigente de Voyage que voyage-3.5 quedó reclasificado
// como "modelo antiguo" SIN tokens gratis, mientras que voyage-4-lite sí
// tiene 200M tokens gratis por cuenta y comparte los mismos 1024 dims por
// defecto (reemplazo directo, cero cambio de schema). Cambiado antes de que
// existiera ningún embedding real en document_chunks — costo de switch: cero.
const MODEL_ID = "voyage-4-lite";

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string, inputType: EmbeddingInputType): Promise<number[]> {
    const { embedding } = await embed({
      model: voyage.embedding(MODEL_ID),
      value: text,
      providerOptions: { voyage: { inputType } },
    });
    return embedding;
  }

  async embedBatch(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: voyage.embedding(MODEL_ID),
      values: texts,
      providerOptions: { voyage: { inputType } },
    });
    return embeddings;
  }
}
