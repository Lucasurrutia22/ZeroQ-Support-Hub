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
// disponible apenas se sube. Ampliado (pedido explícito del usuario,
// 2026-07-31) a los 4 roles operativos — originalmente solo admin/N2 (brief:
// "sube manuales" era acción de Ingeniero N2), pero N1 y Supervisor también
// necesitan poder subir documentación real en la operación diaria.
// "readonly" queda deliberadamente afuera: es el único rol que no puede
// escribir nada en el resto de la plataforma (tampoco crea/edita
// procedimientos, ver canCreateProcedure/canEditProcedure) — subir un
// documento contradice ese contrato.
export function canUploadDocument(role: Role): boolean {
  return role !== "readonly";
}

// Todos los roles, incluido Solo Lectura (UI_UX_DESIGN.md §3.1, matriz de
// acciones — Favoritos es ✅ para los 5 roles).
export function canFavorite(role: Role): boolean {
  void role; // firma consistente con el resto de las policies; todos los roles pueden
  return true;
}

// UC-EN-02: ver el propio historial de vistas — todos los roles, es
// información personal del usuario, no un dato sensible del negocio.
export function canViewOwnHistory(role: Role): boolean {
  void role;
  return true;
}
