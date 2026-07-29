import { prisma } from "@/shared/infrastructure/prisma/client";
import type { ProcedureWithDetails } from "../../domain/types";
import type { FavoriteRepository } from "../../domain/ports";
import {
  mapProcedure,
  procedureDetailInclude,
} from "./PrismaProcedureRepository";

export class PrismaFavoriteRepository implements FavoriteRepository {
  async isFavorited(userId: string, procedureId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_procedureId: { userId, procedureId } },
    });
    return favorite !== null;
  }

  async add(userId: string, procedureId: string): Promise<void> {
    await prisma.favorite.upsert({
      where: { userId_procedureId: { userId, procedureId } },
      update: {},
      create: { userId, procedureId },
    });
  }

  async remove(userId: string, procedureId: string): Promise<void> {
    await prisma.favorite
      .delete({ where: { userId_procedureId: { userId, procedureId } } })
      .catch(() => undefined); // idempotente: quitar un favorito que no existe no es error
  }

  async listByUser(userId: string): Promise<ProcedureWithDetails[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { procedure: { include: procedureDetailInclude } },
    });

    return favorites.map((favorite) => mapProcedure(favorite.procedure));
  }
}
