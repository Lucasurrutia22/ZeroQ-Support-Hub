import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import {
  clientRepository,
  infrastructureAssetRepository,
} from "../../infrastructure/container";
import type { AssetType, InfrastructureAsset } from "../../domain/types";
import { canManageInfrastructure } from "../policies";

export interface RegisterAssetCommand {
  clientId: string;
  type: AssetType;
  model?: string;
  location?: string;
  serialNumber?: string;
  metadata?: Record<string, unknown>;
}

export async function registerAsset(
  actingUser: ActingUser,
  command: RegisterAssetCommand,
): Promise<Result<InfrastructureAsset>> {
  if (!canManageInfrastructure(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no puede registrar infraestructura.",
      ),
    );
  }

  const client = await clientRepository.findById(command.clientId);
  if (!client) {
    return err(new DomainError("client_not_found", "El cliente no existe."));
  }

  const asset = await infrastructureAssetRepository.create({
    clientId: command.clientId,
    type: command.type,
    model: command.model ?? null,
    location: command.location ?? null,
    serialNumber: command.serialNumber ?? null,
    metadata: command.metadata ?? null,
  });

  return ok(asset);
}

export async function listAssetsByClient(
  clientId: string,
): Promise<InfrastructureAsset[]> {
  return infrastructureAssetRepository.listByClient(clientId);
}

export async function getAssetById(
  id: string,
): Promise<InfrastructureAsset | null> {
  return infrastructureAssetRepository.findById(id);
}
