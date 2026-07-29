import type { Role } from "../domain/role";

// Policy objects (ARCHITECTURE.md §8). Gestión de usuarios: solo Admin —
// mismo criterio que canManageCategories en Knowledge.
export function canManageUsers(role: Role): boolean {
  return role === "admin";
}
