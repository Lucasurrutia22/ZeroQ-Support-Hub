import type { Role } from "./role";

// Tipos de dominio del contexto Identity — independientes de Prisma
// (ARCHITECTURE.md §6). `UserSummary` deliberadamente no incluye
// `passwordHash`: nada por encima de infrastructure/ debe poder verlo.
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}
