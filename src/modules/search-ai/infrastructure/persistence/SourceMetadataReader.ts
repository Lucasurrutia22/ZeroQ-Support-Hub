import { prisma } from "@/shared/infrastructure/prisma/client";
import type { DocumentChunkSourceType } from "@/modules/search-ai/domain/types";

// Enriquece chunks ya rankeados (VectorStore.hybridSearch, que no conoce
// Knowledge/Cases) con el identificador citable por el LLM, el título
// legible y el link de la fuente real — usado por SemanticSearchUseCase,
// nunca por PgVectorStore (Ports & Adapters: el vector store no se acopla a
// los agregados que indexa).
//
// `entityId`/`entityUrl` son deliberadamente distintos del `sourceId` crudo
// de DocumentChunk: para procedure_version, sourceId es el id de la
// ProcedureVersion indexada, pero lo citable/enlazable es el Procedure
// (su slug). Resolverlo acá, una sola vez, evita que la UI o el historial
// de conversaciones tengan que repetir este join más adelante.
export interface SourceMetadata {
  citationTag: string;
  title: string;
  entityId: string;
  entityUrl: string;
}

function keyFor(sourceType: DocumentChunkSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export class SourceMetadataReader {
  async resolveMany(
    items: { sourceType: DocumentChunkSourceType; sourceId: string }[],
  ): Promise<Map<string, SourceMetadata>> {
    const result = new Map<string, SourceMetadata>();

    const versionIds = items
      .filter((item) => item.sourceType === "procedure_version")
      .map((item) => item.sourceId);
    const caseIds = items
      .filter((item) => item.sourceType === "resolved_case")
      .map((item) => item.sourceId);

    if (versionIds.length > 0) {
      const versions = await prisma.procedureVersion.findMany({
        where: { id: { in: versionIds } },
        include: { procedure: true },
      });
      for (const version of versions) {
        result.set(keyFor("procedure_version", version.id), {
          citationTag: `PROC-${version.procedure.id}-v${version.versionNumber}`,
          title: version.procedure.title,
          entityId: version.procedure.id,
          entityUrl: `/procedures/${version.procedure.slug}`,
        });
      }
    }

    if (caseIds.length > 0) {
      const cases = await prisma.resolvedCase.findMany({ where: { id: { in: caseIds } } });
      for (const resolvedCase of cases) {
        result.set(keyFor("resolved_case", resolvedCase.id), {
          citationTag: `CASE-${resolvedCase.id}`,
          title: resolvedCase.title,
          entityId: resolvedCase.id,
          entityUrl: `/cases/${resolvedCase.id}`,
        });
      }
    }

    return result;
  }
}
