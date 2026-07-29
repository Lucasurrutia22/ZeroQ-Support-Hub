import { PrismaClientRepository } from "./persistence/PrismaClientRepository";
import { PrismaInfrastructureAssetRepository } from "./persistence/PrismaInfrastructureAssetRepository";

export const clientRepository = new PrismaClientRepository();
export const infrastructureAssetRepository =
  new PrismaInfrastructureAssetRepository();
