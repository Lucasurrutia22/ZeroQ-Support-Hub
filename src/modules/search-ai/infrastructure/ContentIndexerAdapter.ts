import type { ContentIndexer, IndexableSourceType } from "@/shared/domain/ports/content-indexer";
import { indexContent } from "../application/use-cases/index-content";
import { backgroundTaskRunner } from "./container";

// Implementa el port compartido ContentIndexer (src/shared/domain/ports/
// content-indexer.ts) para que Knowledge pueda disparar indexación sin
// importar nada de search-ai más allá de este contrato mínimo.
//
// Simplificación deliberada respecto a D7/ARCHITECTURE.md §9 (BullMQ + Redis
// como cola de jobs): no se levantó esa infraestructura en este alcance —
// "indexAsync" dispara el trabajo sin esperarlo (fire-and-forget) en vez de
// encolar un job real. Mismo efecto práctico para el volumen de uso interno
// esperado (no bloquea la aprobación/creación), pero sin reintentos ni
// persistencia si el proceso muere a mitad de la indexación. Ver
// AI_RAG_DESIGN.md / memoria del proyecto: upgrade a BullMQ documentado
// como fast-follow, no como deuda oculta.
//
// `backgroundTaskRunner.run(...)` en vez de `void promise.then(...)`: una
// promesa suelta puede cortarse apenas Next.js termina de enviar la
// respuesta de la Server Action que la disparó (confirmado en vivo con la
// ingesta de Bitácora, ver BackgroundTaskRunner) — con contenido chico esto
// solía terminar a tiempo, pero no es garantía.
export class ContentIndexerAdapter implements ContentIndexer {
  indexAsync(sourceType: IndexableSourceType, sourceId: string): void {
    backgroundTaskRunner.run(async () => {
      const result = await indexContent(sourceType, sourceId);
      if (!result.ok) {
        console.error(
          `[search-ai] Falló la indexación de ${sourceType}:${sourceId} — ${result.error.code}: ${result.error.message}`,
        );
      }
    });
  }
}

export const contentIndexer = new ContentIndexerAdapter();
