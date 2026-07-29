import type {
  Attachment,
  AttachmentFileType,
  ResolvedCase,
  ResolvedCaseWithDetails,
} from "./types";

export interface CreateResolvedCaseInput {
  title: string;
  description: string;
  clientId?: string | null;
  infrastructureAssetId?: string | null;
  categoryId: string;
  engineerId: string;
  symptoms: string;
  rootCause: string;
  solution: string;
  timeSpentMinutes?: number | null;
  relatedProcedureIds?: string[];
}

export interface ResolvedCaseListFilter {
  clientId?: string;
  categoryId?: string;
  infrastructureAssetId?: string;
}

export interface ResolvedCaseRepository {
  create(input: CreateResolvedCaseInput): Promise<ResolvedCaseWithDetails>;
  findById(id: string): Promise<ResolvedCaseWithDetails | null>;
  list(filter: ResolvedCaseListFilter): Promise<ResolvedCaseWithDetails[]>;
  linkProcedure(caseId: string, procedureId: string): Promise<void>;
}

export interface CreateAttachmentInput {
  caseId: string;
  fileType: AttachmentFileType;
  storageKey: string;
  uploadedBy: string;
}

export interface AttachmentRepository {
  create(input: CreateAttachmentInput): Promise<Attachment>;
  findById(id: string): Promise<Attachment | null>;
  listByCase(caseId: string): Promise<Attachment[]>;
}

export type { ResolvedCase };
