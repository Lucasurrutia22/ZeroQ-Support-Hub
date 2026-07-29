import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Prisma } from "../../../../../generated/prisma/client";
import type {
  Procedure,
  ProcedureVersion,
  ProcedureWithDetails,
} from "../../domain/types";
import type {
  CreateProcedureInput,
  ProcedureListFilter,
  ProcedureRepository,
} from "../../domain/ports";

export const procedureDetailInclude = {
  category: true,
  currentVersion: true,
  tags: { include: { tag: true } },
  _count: { select: { favorites: true } },
} satisfies Prisma.ProcedureInclude;

const detailInclude = procedureDetailInclude;

type ProcedureRow = Prisma.ProcedureGetPayload<{ include: typeof detailInclude }>;

export function mapProcedure(row: ProcedureRow): ProcedureWithDetails {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryId: row.categoryId,
    status: row.status,
    riskLevel: row.riskLevel,
    estimatedTimeMinutes: row.estimatedTimeMinutes,
    currentVersionId: row.currentVersionId,
    authorId: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.category,
    currentVersion: row.currentVersion,
    tags: row.tags.map((t) => t.tag),
    favoriteCount: row._count.favorites,
  };
}

export class PrismaProcedureRepository implements ProcedureRepository {
  async create(input: CreateProcedureInput): Promise<ProcedureWithDetails> {
    const created = await prisma.$transaction(async (tx) => {
      const procedure = await tx.procedure.create({
        data: {
          title: input.title,
          slug: input.slug,
          categoryId: input.categoryId,
          riskLevel: input.riskLevel,
          estimatedTimeMinutes: input.estimatedTimeMinutes ?? null,
          authorId: input.authorId,
        },
      });

      const version = await tx.procedureVersion.create({
        data: {
          procedureId: procedure.id,
          versionNumber: 1,
          contentMarkdown: input.contentMarkdown,
          authorId: input.authorId,
        },
      });

      await tx.procedure.update({
        where: { id: procedure.id },
        data: { currentVersionId: version.id },
      });

      if (input.tagIds && input.tagIds.length > 0) {
        await tx.procedureTag.createMany({
          data: input.tagIds.map((tagId) => ({
            procedureId: procedure.id,
            tagId,
          })),
        });
      }

      return procedure.id;
    });

    const result = await this.findById(created);
    if (!result) throw new Error("No se pudo leer el procedimiento recién creado");
    return result;
  }

  async findById(id: string): Promise<ProcedureWithDetails | null> {
    const row = await prisma.procedure.findUnique({
      where: { id },
      include: detailInclude,
    });
    return row ? mapProcedure(row) : null;
  }

  async findBySlug(slug: string): Promise<ProcedureWithDetails | null> {
    const row = await prisma.procedure.findUnique({
      where: { slug },
      include: detailInclude,
    });
    return row ? mapProcedure(row) : null;
  }

  async list(filter: ProcedureListFilter): Promise<ProcedureWithDetails[]> {
    const where: Prisma.ProcedureWhereInput = {
      categoryId: filter.categoryId,
      status: filter.status,
      tags: filter.tagId ? { some: { tagId: filter.tagId } } : undefined,
      title: filter.search
        ? { contains: filter.search, mode: "insensitive" }
        : undefined,
    };

    const rows = await prisma.procedure.findMany({
      where,
      include: detailInclude,
      orderBy: { updatedAt: "desc" },
    });

    return rows.map(mapProcedure);
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.procedure.count({ where: { slug } });
    return count > 0;
  }

  async addVersion(params: {
    procedureId: string;
    contentMarkdown: string;
    changeSummary?: string | null;
    authorId: string;
  }): Promise<ProcedureVersion> {
    return prisma.$transaction(async (tx) => {
      const last = await tx.procedureVersion.findFirst({
        where: { procedureId: params.procedureId },
        orderBy: { versionNumber: "desc" },
      });

      const version = await tx.procedureVersion.create({
        data: {
          procedureId: params.procedureId,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          contentMarkdown: params.contentMarkdown,
          changeSummary: params.changeSummary ?? null,
          authorId: params.authorId,
        },
      });

      await tx.procedure.update({
        where: { id: params.procedureId },
        data: { currentVersionId: version.id },
      });

      return version;
    });
  }

  async listVersions(procedureId: string): Promise<ProcedureVersion[]> {
    return prisma.procedureVersion.findMany({
      where: { procedureId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async updateStatus(
    id: string,
    status: Procedure["status"],
  ): Promise<Procedure> {
    return prisma.procedure.update({ where: { id }, data: { status } });
  }

  async setTags(procedureId: string, tagIds: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.procedureTag.deleteMany({ where: { procedureId } }),
      prisma.procedureTag.createMany({
        data: tagIds.map((tagId) => ({ procedureId, tagId })),
      }),
    ]);
  }
}
