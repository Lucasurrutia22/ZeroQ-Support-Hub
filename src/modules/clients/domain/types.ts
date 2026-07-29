// Tipos de dominio del contexto Clients — independientes de Prisma
// (ARCHITECTURE.md §6).

export type ClientType =
  | "banco"
  | "hospital"
  | "municipalidad"
  | "retail"
  | "gobierno"
  | "otro";

export type AssetType =
  | "totem"
  | "modulo_atencion"
  | "pantalla"
  | "impresora"
  | "servidor"
  | "tv_box"
  | "otro";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  contactInfo: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InfrastructureAsset {
  id: string;
  clientId: string;
  type: AssetType;
  model: string | null;
  location: string | null;
  serialNumber: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}
