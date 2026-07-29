import type { ContentIndexer, IndexableSourceType } from "@/shared/domain/ports/content-indexer";
import { indexContent } from "../application/use-cases/index-content";

// Implementa el port compartido ContentIndexer (src/shared/domain/ports/
// content-indexer.ts) para que Knowledge pueda disparar indexación sin
// importar nada de search-ai más allá de este contrato mínimo.
//
// Simplificación deliberada respecto a D7/ARCHITECTURE.md §9 (BullMQ + Redis
// como cola de jobs): no se levantó esa infraestructura en este alcance —
// "indexAsync" dispara la promesa sin esperarla (fire-and-forget in-process)
// en vez de encolar un job real. Mismo efecto práctico para el volumen de
// uso interno esperado (no bloquea la aprobación/creación), pero sin
// reintentos ni persistencia si el proceso muere a mitad de la indexación.
// Ver AI_RAG_DESIGN.md / memoria del proyecto: upgrade a BullMQ documentado
// como fast-follow, no como deuda oculta.
export class ContentIndexerAdapter implements ContentIndexer {
  indexAsync(sourceType: IndexableSourceType, sourceId: string): void {
    void indexContent(sourceType, sourceId).then((result) => {
      if (!result.ok) {
        console.error(
          `[search-ai] Falló la indexación de ${sourceType}:${sourceId} — ${result.error.code}: ${result.error.message}`,
        );
      }
    });
  }
}

export const contentIndexer = new ContentIndexerAdapter();
