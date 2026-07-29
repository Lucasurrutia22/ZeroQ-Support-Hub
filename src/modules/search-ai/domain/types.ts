// Tipos de dominio del contexto Search & AI — independientes de Prisma y de
// cualquier SDK de IA (ARCHITECTURE.md §6). Ver docs/architecture/AI_RAG_DESIGN.md
// para el diseño completo.

export type DocumentChunkSourceType = "procedure_version" | "resolved_case";

export interface DocumentChunk {
  id: string;
  sourceType: DocumentChunkSourceType;
  sourceId: string;
  content: string;
  chunkIndex: number;
  categoryId: string | null;
  clientId: string | null;
}

// Chunk recuperado en una búsqueda, con su score de fusión (RRF, ver §5 del
// diseño) — lo que devuelve VectorStore.hybridSearch, antes de enriquecerlo
// con metadata de la fuente (título, cita). El score no se persiste, solo
// existe en memoria durante el retrieval.
export interface ScoredChunk extends DocumentChunk {
  score: number;
}

// ScoredChunk + metadata de la fuente (Procedure/ResolvedCase) resuelta por
// SemanticSearchUseCase — VectorStore no conoce Knowledge/Cases, solo sabe
// de `document_chunks` (Ports & Adapters: el vector store no debe acoplarse
// a los agregados que indexa).
//
// IMPORTANTE: `sourceId` (heredado de DocumentChunk) es el id de la fila
// indexada — para sourceType="procedure_version" eso es el id de la
// ProcedureVersion, NO el del Procedure. `entityId`/`entityUrl` son los que
// hay que usar para citar/enlazar la entidad real (Procedure vía su slug,
// ResolvedCase vía su id) — nunca `sourceId` para eso.
export interface RankedChunk extends ScoredChunk {
  /** Identificador citable por el LLM, ej. "PROC-<procedureId>-v<n>" / "CASE-<id>" (AI_RAG_DESIGN.md §4.2). */
  citationTag: string;
  sourceTitle: string;
  /** Id de la entidad citable (Procedure.id o ResolvedCase.id) — no confundir con `sourceId`. */
  entityId: string;
  /** Ruta relativa a la app, ej. "/procedures/mi-slug" o "/cases/<id>". */
  entityUrl: string;
}

export interface SearchFilters {
  categoryId?: string;
  clientId?: string;
}

export type AIMessageRole = "user" | "assistant";

// "web" (AI_RAG_DESIGN.md — búsqueda externa, pedido explícito del usuario):
// fuente NO verificada por ZeroQ, a diferencia de procedure_version/
// resolved_case que vienen de contenido propio indexado. La UI debe
// distinguirla visualmente (ver SOURCE_TYPE_LABELS en ai-ui.ts).
export type SourceReferenceType = DocumentChunkSourceType | "web";

export interface SourceReference {
  type: SourceReferenceType;
  /** Procedure.id/ResolvedCase.id para fuentes internas; la URL misma (clave única) para type="web". */
  sourceId: string;
  title: string;
  /** Ruta relativa a la app para fuentes internas, o la URL externa completa para type="web". */
  url: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  sourceReferences: SourceReference[] | null;
  createdAt: Date;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIConversationWithMessages extends AIConversation {
  messages: AIMessage[];
}

// Salida estructurada del LLM (AI_RAG_DESIGN.md §4.2) — el contrato que todo
// LLMProvider debe producir, sin importar el proveedor activo.
export interface AskAIStructuredAnswer {
  answer: string;
  applicableProcedures: { sourceRef: string; title: string }[];
  commands: string[];
  warnings: string[];
  similarCases: { sourceRef: string; title: string }[];
  /**
   * Fuentes web citadas — ya validadas contra los resultados reales
   * devueltos por la tool de búsqueda (nunca lo que el LLM "dice" que
   * encontró sin verificar, mismo criterio anti-alucinación que
   * applicableProcedures/similarCases). Ver VercelAiLLMProvider.
   */
  externalSources: { url: string; title: string }[];
  riskLevel: "low" | "medium" | "high" | null;
  estimatedTimeMinutes: number | null;
  hasSufficientContext: boolean;
}
