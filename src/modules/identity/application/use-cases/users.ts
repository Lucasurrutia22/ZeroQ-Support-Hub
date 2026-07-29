import bcrypt from "bcryptjs";
import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser, Role } from "../../domain/role";
import type { CreateUserInput, UserSummary } from "../../domain/types";
import { userRepository } from "../../infrastructure/container";
import { canManageUsers } from "../policies";

const SALT_ROUNDS = 12; // mismo costo que prisma/seed.ts — no reinventar el número.

export async function listUsers(actingUser: ActingUser): Promise<Result<UserSummary[]>> {
  if (!canManageUsers(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no puede administrar usuarios."));
  }
  return ok(await userRepository.list());
}

export async function createUser(
  actingUser: ActingUser,
  input: CreateUserInput,
): Promise<Result<UserSummary>> {
  if (!canManageUsers(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no puede administrar usuarios."));
  }

  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    return err(new DomainError("email_taken", "Ya existe un usuario con ese email."));
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });
  return ok(user);
}

export async function setUserActive(
  actingUser: ActingUser,
  userId: string,
  active: boolean,
): Promise<Result<void>> {
  if (!canManageUsers(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no puede administrar usuarios."));
  }
  // Un admin no puede desactivarse a sí mismo — evita quedarse afuera sin
  // otro admin activo que lo reactive.
  if (userId === actingUser.id && !active) {
    return err(new DomainError("cannot_deactivate_self", "No podés desactivar tu propia cuenta."));
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    return err(new DomainError("not_found", "El usuario no existe."));
  }

  await userRepository.setActive(userId, active);
  return ok(undefined);
}

export async function setUserRole(
  actingUser: ActingUser,
  userId: string,
  role: Role,
): Promise<Result<void>> {
  if (!canManageUsers(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no puede administrar usuarios."));
  }
  // Mismo criterio que setUserActive: un admin no puede quitarse a sí mismo
  // el rol de admin (evita quedarse sin ningún admin que pueda revertirlo).
  if (userId === actingUser.id && role !== "admin") {
    return err(new DomainError("cannot_demote_self", "No podés cambiar tu propio rol de administrador."));
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    return err(new DomainError("not_found", "El usuario no existe."));
  }

  await userRepository.setRole(userId, role);
  return ok(undefined);
}
