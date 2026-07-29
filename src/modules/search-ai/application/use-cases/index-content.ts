import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import {
  embeddingProvider,
  sourceContentReader,
  vectorStore,
} from "../../infrastructure/container";
import { chunkMarkdown } from "../chunking";
import type { DocumentChunkSourceType } from "../../domain/types";

// UC-AI-04 (USE_CASES.md) — indexa contenido ya aprobado/creado.
// AI_RAG_DESIGN.md §1/§3: re-chunk y re-embed completo en cada llamada
// (nunca un diff incremental); borra los chunks de TODAS las versiones
// hermanas antes de insertar los nuevos, para que una versión superada no
// quede compitiendo en el retrieval.
export async function indexContent(
  sourceType: DocumentChunkSourceType,
  sourceId: string,
): Promise<Result<{ chunksIndexed: number }>> {
  const source = await sourceContentReader.read(sourceType, sourceId);
  if (!source) {
    return err(new DomainError("source_not_found", "La fuente a indexar no existe."));
  }

  const candidates = chunkMarkdown(source.markdown);
  if (candidates.length === 0) {
    return err(new DomainError("empty_content", "No hay contenido para indexar."));
  }

  // El embedding provider (red externa) y el vector store pueden fallar por
  // causas ajenas al contenido (credencial inválida, red caída, etc.) — se
  // capturan acá para que SIEMPRE se devuelva un Result, nunca una excepción
  // sin atrapar. Esto es crítico porque ContentIndexerAdapter llama a este
  // use case en modo fire-and-forget (`.then()`, sin `.catch()`): si esto
  // lanzara, sería un unhandled promise rejection en producción cada vez que
  // el proveedor de embeddings tenga un problema momentáneo.
  try {
    const embeddings = await embeddingProvider.embedBatch(
      candidates.map((candidate) => candidate.content),
      "document",
    );

    await vectorStore.deleteBySource(sourceType, source.siblingSourceIds);
    await vectorStore.insertChunks(
      candidates.map((candidate, index) => ({
        sourceType,
        sourceId,
        content: candidate.content,
        chunkIndex: candidate.chunkIndex,
        categoryId: source.categoryId,
        clientId: source.clientId,
        embedding: embeddings[index],
      })),
    );

    return ok({ chunksIndexed: candidates.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new DomainError("indexing_failed", `Falló la indexación: ${message}`));
  }
}
