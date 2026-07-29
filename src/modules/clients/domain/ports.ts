import type { AssetType, Client, ClientType, InfrastructureAsset } from "./types";

export interface CreateClientInput {
  name: string;
  type: ClientType;
  contactInfo?: Record<string, unknown> | null;
}

export interface ClientRepository {
  create(input: CreateClientInput): Promise<Client>;
  update(id: string, input: Partial<CreateClientInput>): Promise<Client>;
  findById(id: string): Promise<Client | null>;
  list(filter: { type?: ClientType }): Promise<Client[]>;
}

export interface RegisterAssetInput {
  clientId: string;
  type: AssetType;
  model?: string | null;
  location?: string | null;
  serialNumber?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface InfrastructureAssetRepository {
  create(input: RegisterAssetInput): Promise<InfrastructureAsset>;
  findById(id: string): Promise<InfrastructureAsset | null>;
  listByClient(clientId: string): Promise<InfrastructureAsset[]>;
}
