import { prisma } from "@/shared/infrastructure/prisma/client";
import type { IndexableContent, SourceContentReader } from "@/modules/search-ai/domain/ports";
import type { DocumentChunkSourceType } from "@/modules/search-ai/domain/types";

// Lectura de solo-consulta directa sobre Knowledge para indexación — patrón
// "CQRS ligero" ya documentado en ARCHITECTURE.md §8 (lecturas de otros
// agregados sin pasar por sus repositorios de escritura). search-ai nunca
// importa nada de modules/knowledge más allá de esto.
export class PrismaSourceContentReader implements SourceContentReader {
  async read(
    sourceType: DocumentChunkSourceType,
    sourceId: string,
  ): Promise<IndexableContent | null> {
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
    };
  }
}
