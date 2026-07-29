import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Prisma } from "../../../../../generated/prisma/client";
import type { ResolvedCaseWithDetails } from "../../domain/types";
import type {
  CreateResolvedCaseInput,
  ResolvedCaseListFilter,
  ResolvedCaseRepository,
} from "../../domain/ports";

const detailInclude = {
  category: { select: { name: true } },
  client: { select: { name: true } },
  procedures: { select: { procedureId: true } },
} satisfies Prisma.ResolvedCaseInclude;

type ResolvedCaseRow = Prisma.ResolvedCaseGetPayload<{
  include: typeof detailInclude;
}>;

function mapCase(row: ResolvedCaseRow): ResolvedCaseWithDetails {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    clientId: row.clientId,
    infrastructureAssetId: row.infrastructureAssetId,
    categoryId: row.categoryId,
    engineerId: row.engineerId,
    symptoms: row.symptoms,
    rootCause: row.rootCause,
    solution: row.solution,
    timeSpentMinutes: row.timeSpentMinutes,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    categoryName: row.category.name,
    clientName: row.client?.name ?? null,
    relatedProcedureIds: row.procedures.map((p) => p.procedureId),
  };
}

export class PrismaResolvedCaseRepository implements ResolvedCaseRepository {
  async create(
    input: CreateResolvedCaseInput,
  ): Promise<ResolvedCaseWithDetails> {
    const created = await prisma.$transaction(async (tx) => {
      const resolvedCase = await tx.resolvedCase.create({
        data: {
          title: input.title,
          description: input.description,
          clientId: input.clientId ?? null,
          infrastructureAssetId: input.infrastructureAssetId ?? null,
          categoryId: input.categoryId,
          engineerId: input.engineerId,
          symptoms: input.symptoms,
          rootCause: input.rootCause,
          solution: input.solution,
          timeSpentMinutes: input.timeSpentMinutes ?? null,
        },
      });

      if (input.relatedProcedureIds && input.relatedProcedureIds.length > 0) {
        await tx.caseProcedure.createMany({
          data: input.relatedProcedureIds.map((procedureId) => ({
            caseId: resolvedCase.id,
            procedureId,
          })),
        });
      }

      return resolvedCase.id;
    });

    const result = await this.findById(created);
    if (!result) throw new Error("No se pudo leer el caso recién creado");
    return result;
  }

  async findById(id: string): Promise<ResolvedCaseWithDetails | null> {
    const row = await prisma.resolvedCase.findUnique({
      where: { id },
      include: detailInclude,
    });
    return row ? mapCase(row) : null;
  }

  async list(
    filter: ResolvedCaseListFilter,
  ): Promise<ResolvedCaseWithDetails[]> {
    const rows = await prisma.resolvedCase.findMany({
      where: {
        clientId: filter.clientId,
        categoryId: filter.categoryId,
        infrastructureAssetId: filter.infrastructureAssetId,
      },
      include: detailInclude,
      orderBy: { resolvedAt: "desc" },
    });
    return rows.map(mapCase);
  }

  async linkProcedure(caseId: string, procedureId: string): Promise<void> {
    await prisma.caseProcedure.upsert({
      where: { caseId_procedureId: { caseId, procedureId } },
      update: {},
      create: { caseId, procedureId },
    });
  }
}
