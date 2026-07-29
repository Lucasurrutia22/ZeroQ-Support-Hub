import type { Role } from "@/modules/identity/domain/role";

// USE_CASES.md UC-CS-01/02: crear caso y vincular procedimientos = N1, N2
// (+ Admin como override). Sin flujo de aprobación (D-decisión ya tomada
// para ResolvedCase, ARCHITECTURE.md §5.1) — disponible de inmediato.
// Subir evidencias/logs sigue la misma regla que crear/editar el caso.

export function canCreateCase(role: Role): boolean {
  return role === "admin" || role === "engineer_l1" || role === "engineer_l2";
}

export function canEditCase(role: Role): boolean {
  return role === "admin" || role === "engineer_l1" || role === "engineer_l2";
}

export function canUploadAttachment(role: Role): boolean {
  return canEditCase(role);
}
