// Tipos de dominio del contexto Knowledge — independientes de Prisma
// (ARCHITECTURE.md §6: domain/application no importan @prisma/client). Los
// repositorios de infrastructure mapean las filas de Prisma a estos tipos.

export type ProcedureStatus = "draft" | "in_review" | "approved" | "deprecated";
export type RiskLevel = "low" | "medium" | "high";
export type DocumentFileType = "manual" | "datasheet" | "firmware_notes" | "otro";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ProcedureVersion {
  id: string;
  procedureId: string;
  versionNumber: number;
  contentMarkdown: string;
  changeSummary: string | null;
  authorId: string;
  createdAt: Date;
}

export interface Procedure {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  status: ProcedureStatus;
  riskLevel: RiskLevel;
  estimatedTimeMinutes: number | null;
  currentVersionId: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcedureWithDetails extends Procedure {
  category: Category;
  currentVersion: ProcedureVersion | null;
  tags: Tag[];
  favoriteCount: number;
}

export interface Document {
  id: string;
  title: string;
  categoryId: string;
  fileType: DocumentFileType;
  storageKey: string;
  uploadedBy: string;
  supersedesId: string | null;
  createdAt: Date;
}

export interface Favorite {
  userId: string;
  procedureId: string;
  createdAt: Date;
}
