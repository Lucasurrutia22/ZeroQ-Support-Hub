import { prisma } from "@/shared/infrastructure/prisma/client";
import type { ViewHistoryRepository } from "../../domain/ports";
import type { ViewedEntityType, ViewHistoryEntry } from "../../domain/types";

const DEFAULT_LIMIT = 50;

export class PrismaViewHistoryRepository implements ViewHistoryRepository {
  async recordView(
    userId: string,
    entityType: ViewedEntityType,
    entityId: string,
  ): Promise<void> {
    await prisma.viewHistory.upsert({
      where: { userId_entityType_entityId: { userId, entityType, entityId } },
      update: { viewedAt: new Date() },
      create: { userId, entityType, entityId },
    });
  }

  async listByUser(userId: string, limit = DEFAULT_LIMIT): Promise<ViewHistoryEntry[]> {
    const entries = await prisma.viewHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: limit,
    });
    if (entries.length === 0) return [];

    const procedureIds = entries
      .filter((entry) => entry.entityType === "procedure")
      .map((entry) => entry.entityId);
    const documentIds = entries
      .filter((entry) => entry.entityType === "document")
      .map((entry) => entry.entityId);

    const [procedures, documents] = await Promise.all([
      procedureIds.length > 0
        ? prisma.procedure.findMany({
            where: { id: { in: procedureIds } },
            select: { id: true, title: true, slug: true },
          })
        : Promise.resolve([]),
      documentIds.length > 0
        ? prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);

    const procedureById = new Map(procedures.map((p) => [p.id, p]));
    const documentById = new Map(documents.map((d) => [d.id, d]));

    return entries
      .map((entry): ViewHistoryEntry | null => {
        if (entry.entityType === "procedure") {
          const procedure = procedureById.get(entry.entityId);
          // Edge case: el Procedure/Document fue borrado después de la
          // visita — se omite en vez de mostrar un link roto.
          if (!procedure) return null;
          return {
            id: entry.id,
            entityType: "procedure",
            entityId: entry.entityId,
            viewedAt: entry.viewedAt,
            title: procedure.title,
            url: `/procedures/${procedure.slug}`,
          };
        }
        const document = documentById.get(entry.entityId);
        if (!document) return null;
        return {
          id: entry.id,
          entityType: "document",
          entityId: entry.entityId,
          viewedAt: entry.viewedAt,
          title: document.title,
          url: `/documents/${document.id}`,
        };
      })
      .filter((entry): entry is ViewHistoryEntry => entry !== null);
  }
}
