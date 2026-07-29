import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Client, ClientType } from "../../domain/types";
import type { ClientRepository, CreateClientInput } from "../../domain/ports";
import type { Prisma } from "../../../../../generated/prisma/client";

export class PrismaClientRepository implements ClientRepository {
  async create(input: CreateClientInput): Promise<Client> {
    return prisma.client.create({
      data: {
        name: input.name,
        type: input.type,
        contactInfo: (input.contactInfo ?? undefined) as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, input: Partial<CreateClientInput>): Promise<Client> {
    return prisma.client.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        contactInfo: input.contactInfo as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id } });
  }

  async list(filter: { type?: ClientType }): Promise<Client[]> {
    return prisma.client.findMany({
      where: { type: filter.type, active: true },
      orderBy: { name: "asc" },
    });
  }
}
