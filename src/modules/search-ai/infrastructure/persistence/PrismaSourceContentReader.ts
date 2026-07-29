import { prisma } from "@/shared/infrastructure/prisma/client";
import type { IndexableContent, SourceContentReader } from "@/modules/search-ai/domain/ports";
import type { DocumentChunkSourceType } from "@/modules/search-ai/domain/types";

// Lectura de solo-consulta directa sobre Knowledge/Cases para indexación —
// patrón "CQRS ligero" ya documentado en ARCHITECTURE.md §8 (lecturas de
// otros agregados sin pasar por sus repositorios de escritura). search-ai
// nunca importa nada de modules/knowledge o modules/cases más allá de esto.
function buildResolvedCaseMarkdown(input: {
  title: string;
  description: string;
  symptoms: string;
  rootCause: string;
  solution: string;
}): string {
  return [
    `# ${input.title}`,
    `## Descripción`,
    input.description,
    `## Síntomas`,
    input.symptoms,
    `## Causa raíz`,
    input.rootCause,
    `## Solución`,
    input.solution,
  ].join("\n\n");
}

export class PrismaSourceContentReader implements SourceContentReader {
  async read(
    sourceType: DocumentChunkSourceType,
    sourceId: string,
  ): Promise<IndexableContent | null> {
    if (sourceType === "procedure_version") {
      const version = await prisma.procedureVersion.findUnique({
        where: { id: sourceId },
        include: { procedure: true },
      });
      if (!version) return null;

      const siblingVersions = await prisma.procedureVersion.findMany({
        where: { procedureId: version.procedureId },
        select: { id: true },
      });

      return {
        sourceType,
        siblingSourceIds: siblingVersions.map((sibling) => sibling.id),
        title: version.procedure.title,
        markdown: `# ${version.procedure.title}\n\n${version.contentMarkdown}`,
        categoryId: version.procedure.categoryId,
        clientId: null,
      };
    }

    const resolvedCase = await prisma.resolvedCase.findUnique({ where: { id: sourceId } });
    if (!resolvedCase) return null;

    return {
      sourceType,
      siblingSourceIds: [resolvedCase.id],
      title: resolvedCase.title,
      markdown: buildResolvedCaseMarkdown(resolvedCase),
      categoryId: resolvedCase.categoryId,
      clientId: resolvedCase.clientId,
    };
  }
}
