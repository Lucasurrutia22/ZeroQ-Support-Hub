import type {
  Category,
  Document,
  DocumentFileType,
  Procedure,
  ProcedureStatus,
  ProcedureVersion,
  ProcedureWithDetails,
  RiskLevel,
  Tag,
  ViewedEntityType,
  ViewHistoryEntry,
} from "./types";

// Ports (interfaces) — los use cases dependen de estas, no de Prisma
// directamente (Repository pattern, ARCHITECTURE.md §8).

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
}

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: Partial<CreateCategoryInput>): Promise<Category>;
}

export interface TagRepository {
  findAll(): Promise<Tag[]>;
  findOrCreateByNames(names: string[]): Promise<Tag[]>;
}

export interface CreateProcedureInput {
  title: string;
  slug: string;
  categoryId: string;
  riskLevel: RiskLevel;
  estimatedTimeMinutes?: number | null;
  authorId: string;
  contentMarkdown: string;
  tagIds?: string[];
}

export interface ProcedureListFilter {
  categoryId?: string;
  status?: ProcedureStatus;
  tagId?: string;
  search?: string;
}

export interface ProcedurePage {
  items: ProcedureWithDetails[];
  total: number;
}

export interface ProcedureRepository {
  create(input: CreateProcedureInput): Promise<ProcedureWithDetails>;
  findById(id: string): Promise<ProcedureWithDetails | null>;
  findBySlug(slug: string): Promise<ProcedureWithDetails | null>;
  list(filter: ProcedureListFilter): Promise<ProcedureWithDetails[]>;
  /**
   * Paginado — usado por el listado principal de Procedimientos (109+ filas
   * y creciendo). `list()` sigue existiendo sin paginar para los llamadores
   * que necesitan el total real (Bitácora contando por categoría, cola de
   * revisión) — no cambiarle la semántica a esos.
   */
  listPaged(
    filter: ProcedureListFilter,
    pagination: { page: number; pageSize: number },
  ): Promise<ProcedurePage>;
  slugExists(slug: string): Promise<boolean>;
  addVersion(params: {
    procedureId: string;
    contentMarkdown: string;
    changeSummary?: string | null;
    authorId: string;
  }): Promise<ProcedureVersion>;
  listVersions(procedureId: string): Promise<ProcedureVersion[]>;
  updateStatus(id: string, status: ProcedureStatus): Promise<Procedure>;
  setTags(procedureId: string, tagIds: string[]): Promise<void>;
}

export interface CreateDocumentInput {
  title: string;
  categoryId: string;
  fileType: DocumentFileType;
  storageKey: string;
  uploadedBy: string;
  supersedesId?: string | null;
}

export interface DocumentListFilter {
  categoryId?: string;
}

export interface DocumentRepository {
  create(input: CreateDocumentInput): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  list(filter: DocumentListFilter): Promise<Document[]>;
}

export interface FavoriteRepository {
  isFavorited(userId: string, procedureId: string): Promise<boolean>;
  add(userId: string, procedureId: string): Promise<void>;
  remove(userId: string, procedureId: string): Promise<void>;
  listByUser(userId: string): Promise<ProcedureWithDetails[]>;
}

// UC-EN-02 — "upsert" de viewedAt (ver comentario del modelo en
// schema.prisma), nunca un log de cada vista por separado.
export interface ViewHistoryRepository {
  recordView(userId: string, entityType: ViewedEntityType, entityId: string): Promise<void>;
  listByUser(userId: string, limit?: number): Promise<ViewHistoryEntry[]>;
}

// El almacenamiento de archivos usa el port genérico compartido
// `FileStorage` (ver src/shared/domain/ports/file-storage.ts) — Cases lo
// reutiliza para Evidencias/Logs, no se duplica un port por módulo.
export type { FileStorage as DocumentStorage } from "@/shared/domain/ports/file-storage";
