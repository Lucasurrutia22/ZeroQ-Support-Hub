import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { favoriteRepository, procedureRepository } from "../../infrastructure/container";
import type { ProcedureWithDetails } from "../../domain/types";
import { canFavorite } from "../policies";

export async function toggleFavorite(
  actingUser: ActingUser,
  procedureId: string,
): Promise<Result<{ favorited: boolean }>> {
  if (!canFavorite(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede guardar favoritos."),
    );
  }

  const procedure = await procedureRepository.findById(procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }

  const alreadyFavorited = await favoriteRepository.isFavorited(
    actingUser.id,
    procedureId,
  );

  if (alreadyFavorited) {
    await favoriteRepository.remove(actingUser.id, procedureId);
    return ok({ favorited: false });
  }

  await favoriteRepository.add(actingUser.id, procedureId);
  return ok({ favorited: true });
}

export async function listFavorites(
  actingUser: ActingUser,
): Promise<ProcedureWithDetails[]> {
  return favoriteRepository.listByUser(actingUser.id);
}
