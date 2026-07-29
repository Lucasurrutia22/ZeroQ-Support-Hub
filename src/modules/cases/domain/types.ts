// Tipos de dominio del contexto Cases — independientes de Prisma
// (ARCHITECTURE.md §6). "Casos Resueltos" = "Incidencias" (misma entidad,
// documentada después de resuelta — confirmado con el usuario, no hay un
// ciclo de vida previo tipo ticket).

export type AttachmentFileType = "image" | "video" | "pdf" | "config" | "log";

export interface ResolvedCase {
  id: string;
  title: string;
  description: string;
  clientId: string | null;
  infrastructureAssetId: string | null;
  categoryId: string;
  engineerId: string;
  symptoms: string;
  rootCause: string;
  solution: string;
  timeSpentMinutes: number | null;
  resolvedAt: Date;
  createdAt: Date;
}

export interface ResolvedCaseWithDetails extends ResolvedCase {
  categoryName: string;
  clientName: string | null;
  relatedProcedureIds: string[];
}

export interface Attachment {
  id: string;
  procedureId: string | null;
  caseId: string | null;
  fileType: AttachmentFileType;
  storageKey: string;
  uploadedBy: string;
  createdAt: Date;
}
