// Los 5 roles fijos del MVP (D4, ARCHITECTURE.md §11) — coincide 1:1 con el
// enum UserRole de prisma/schema.prisma. Se mantiene como union type propio
// (no un re-export del enum de Prisma) para que domain/application no
// dependan de @prisma/client, por Clean Architecture (ARCHITECTURE.md §6).
export type Role =
  | "admin"
  | "supervisor"
  | "engineer_l1"
  | "engineer_l2"
  | "readonly";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor Técnico",
  engineer_l1: "Ingeniero de Soporte N1",
  engineer_l2: "Ingeniero de Soporte N2",
  readonly: "Solo Lectura",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

// Identidad mínima del usuario autenticado que los use cases necesitan para
// aplicar Policies — evita que application/ dependa del tipo Session de
// Auth.js (que vive en infrastructure/presentation).
export interface ActingUser {
  id: string;
  role: Role;
}
