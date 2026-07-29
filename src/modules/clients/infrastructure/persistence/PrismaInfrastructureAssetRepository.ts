import { prisma } from "@/shared/infrastructure/prisma/client";
import type { InfrastructureAsset } from "../../domain/types";
import type {
  InfrastructureAssetRepository,
  RegisterAssetInput,
} from "../../domain/ports";
import type { Prisma } from "../../../../../generated/prisma/client";

export class PrismaInfrastructureAssetRepository
  implements InfrastructureAssetRepository
{
  async create(input: RegisterAssetInput): Promise<InfrastructureAsset> {
    return prisma.infrastructureAsset.create({
      data: {
        clientId: input.clientId,
        type: input.type,
        model: input.model ?? null,
        location: input.location ?? null,
        serialNumber: input.serialNumber ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string): Promise<InfrastructureAsset | null> {
    return prisma.infrastructureAsset.findUnique({ where: { id } });
  }

  async listByClient(clientId: string): Promise<InfrastructureAsset[]> {
    return prisma.infrastructureAsset.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }
}
