import type { Role } from "@/modules/identity/domain/role";

// Policy objects (ARCHITECTURE.md §8) — un predicado por capacidad, en vez
// de `if (role === "admin")` disperso en los use cases.

export function canCreateProcedure(role: Role): boolean {
  return role === "admin" || role === "engineer_l2";
}

export function canEditProcedure(role: Role): boolean {
  return role === "admin" || role === "engineer_l2";
}

export function canRequestReview(role: Role): boolean {
  return role === "admin" || role === "engineer_l2";
}

export function canApproveProcedure(role: Role): boolean {
  return role === "admin" || role === "supervisor";
}

export function canDeprecateProcedure(role: Role): boolean {
  return role === "admin" || role === "supervisor";
}

export function canManageCategories(role: Role): boolean {
  return role === "admin";
}

// D5 (ARCHITECTURE.md §11/§5.3): Document no tiene flujo de revisión — queda
// disponible apenas se sube. Subir sigue siendo una acción de N2/Admin
// (brief: "sube manuales" es acción de Ingeniero N2).
export function canUploadDocument(role: Role): boolean {
  return role === "admin" || role === "engineer_l2";
}

// Todos los roles, incluido Solo Lectura (UI_UX_DESIGN.md §3.1, matriz de
// acciones — Favoritos es ✅ para los 5 roles).
export function canFavorite(role: Role): boolean {
  void role; // firma consistente con el resto de las policies; todos los roles pueden
  return true;
}
