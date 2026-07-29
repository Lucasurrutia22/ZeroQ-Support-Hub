import { prisma } from "@/shared/infrastructure/prisma/client";
import type { UserRepository } from "@/modules/identity/domain/ports";
import type { UserSummary } from "@/modules/identity/domain/types";
import type { Role } from "@/modules/identity/domain/role";

function mapUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
}): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

const summarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export class PrismaUserRepository implements UserRepository {
  async list(): Promise<UserSummary[]> {
    const users = await prisma.user.findMany({
      select: summarySelect,
      orderBy: { createdAt: "asc" },
    });
    return users.map(mapUser);
  }

  async findById(id: string): Promise<UserSummary | null> {
    const user = await prisma.user.findUnique({ where: { id }, select: summarySelect });
    return user ? mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserSummary | null> {
    const user = await prisma.user.findUnique({ where: { email }, select: summarySelect });
    return user ? mapUser(user) : null;
  }

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserSummary> {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
      },
      select: summarySelect,
    });
    return mapUser(user);
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.user.update({ where: { id }, data: { active } });
  }

  async setRole(id: string, role: Role): Promise<void> {
    await prisma.user.update({ where: { id }, data: { role } });
  }
}
