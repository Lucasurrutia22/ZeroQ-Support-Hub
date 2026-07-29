import type { ActingUser } from "@/modules/identity/domain/role";
import { viewHistoryRepository } from "../../infrastructure/container";
import type { ViewedEntityType, ViewHistoryEntry } from "../../domain/types";
import { canViewOwnHistory } from "../policies";

// UC-EN-02 — se llama desde las páginas de detalle de Procedure/Document en
// cada visita (fire-and-forget no hace falta acá: es un simple upsert a la
// misma base, no una llamada a un proveedor externo como en ContentIndexer).
export async function recordView(
  actingUser: ActingUser,
  entityType: ViewedEntityType,
  entityId: string,
): Promise<void> {
  await viewHistoryRepository.recordView(actingUser.id, entityType, entityId);
}

export async function listOwnHistory(actingUser: ActingUser): Promise<ViewHistoryEntry[]> {
  if (!canViewOwnHistory(actingUser.role)) return [];
  return viewHistoryRepository.listByUser(actingUser.id);
}
