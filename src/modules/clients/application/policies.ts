import type { Role } from "@/modules/identity/domain/role";

// USE_CASES.md UC-CL-01/02/03: crear/editar cliente = Admin; registrar
// infraestructura = Admin o Ingeniero N2. Consultar (listar/detalle) es
// libre para los 5 roles, sin policy.

export function canManageClients(role: Role): boolean {
  return role === "admin";
}

export function canManageInfrastructure(role: Role): boolean {
  return role === "admin" || role === "engineer_l2";
}
