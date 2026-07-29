import type { Role } from "./role";
import type { UserSummary } from "./types";

// Repository pattern (ARCHITECTURE.md §8) — recibe el hash ya calculado
// (bcrypt vive en el use case, no acá: infrastructure/persistence solo
// persiste, no decide cómo hashear).
export interface UserRepository {
  list(): Promise<UserSummary[]>;
  findById(id: string): Promise<UserSummary | null>;
  findByEmail(email: string): Promise<UserSummary | null>;
  create(input: { name: string; email: string; passwordHash: string; role: Role }): Promise<UserSummary>;
  setActive(id: string, active: boolean): Promise<void>;
  setRole(id: string, role: Role): Promise<void>;
}
