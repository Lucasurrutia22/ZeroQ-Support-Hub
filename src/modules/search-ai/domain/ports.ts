// Ports & Adapters (ARCHITECTURE.md §8) del contexto Search & AI. Cada
// interface se implementa en infrastructure/ — el dominio y los use cases
// nunca importan un SDK de IA ni Prisma directamente.

import type {
  AIAnswerOrigin,
  AIConversation,
  AIConversationWithMessages,
  AIMessage,
  AIMessageRole,
  AskAIStructuredAnswer,
  DocumentChunkSourceType,
  RankedChunk,
  ScoredChunk,
  SearchFilters,
  SourceReference,
} from "./types";

export type EmbeddingInputType = "document" | "query";

// Proveedor de embeddings — fijo a Voyage AI por decisión D2 (no swappable
// por config, a diferencia de LLMProvider). Ver AI_RAG_DESIGN.md §2.
export interface EmbeddingProvider {
  embed(text: string, inputType: EmbeddingInputType): Promise<number[]>;
  embedBatch(texts: string[], inputType: EmbeddingInputType): Promise<number[][]>;
}

export interface NewChunkInput {
  sourceType: DocumentChunkSourceType;
  sourceId: string;
  content: string;
  chunkIndex: number;
  categoryId: string | null;
  embedding: number[];
}

export interface HybridSearchInput {
  queryEmbedding: number[];
  queryText: string;
  topK: number;
  filters?: SearchFilters;
}

// Vector store — pgvector sobre el mismo Postgres (D1). El adapter
// concreto (PgVectorStore) es el único lugar del proyecto que escribe SQL
// raw contra `document_chunks`, incluida la fusión híbrida (RRF).
export interface VectorStore {
  /** Borra los chunks de una o más fuentes antes de re-indexar (AI_RAG_DESIGN.md §3: re-chunk completo, no diff). */
  deleteBySource(sourceType: DocumentChunkSourceType, sourceIds: string[]): Promise<void>;
  insertChunks(chunks: NewChunkInput[]): Promise<void>;
  /** Sin enriquecer (sin citationTag/sourceTitle) — VectorStore no conoce Knowledge. */
  hybridSearch(input: HybridSearchInput): Promise<ScoredChunk[]>;
}

export interface GenerateAnswerInput {
  systemPrompt: string;
  query: string;
  chunks: RankedChunk[];
  /** Últimos turnos de la conversación (sin chunks) para coherencia conversacional — AI_RAG_DESIGN.md §6.2. */
  history: { role: AIMessageRole; content: string }[];
}

export interface SummarizeDocumentInput {
  title: string;
  /** Texto ya extraído del archivo (PDF/TXT/MD) — el provider nunca ve el binario. */
  rawText: string;
}

export interface SummarizeDocumentOutput {
  contentMarkdown: string;
}

// LLM — el port que debe poder apuntar a Claude, OpenAI, Ollama o Azure
// OpenAI sin que AskAIUseCase sepa cuál está activo (pedido explícito del
// usuario). `generateAnswer` arma la respuesta estructurada del chat
// (AskAIStructuredAnswer, AI_RAG_DESIGN.md §4.2); `summarizeDocument` es un
// segundo uso del mismo LanguageModel swappable, para la ingesta automática
// de documentos a Bitácora (texto crudo → Markdown resumido, sin tools ni
// salida estructurada — no necesita el mismo aparato que el chat).
export interface LLMProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<AskAIStructuredAnswer>;
  summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput>;
}

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
}

// Búsqueda web real (pedido explícito del usuario: que el asistente "pueda
// investigar desde otros lados" cuando la Bitácora no cubre la pregunta) —
// fijo a Tavily, no swappable (a diferencia de LLMProvider): es un
// complemento del retrieval interno, no una decisión de arquitectura que
// varíe por entorno. El LLMProvider la invoca como tool-calling; nunca se
// llama directo desde AskAIUseCase.
export interface WebSearchProvider {
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>;
}

export interface AIConversationRepository {
  create(userId: string, title: string): Promise<AIConversation>;
  findById(id: string): Promise<AIConversation | null>;
  listByUser(userId: string): Promise<AIConversation[]>;
  touch(id: string): Promise<void>;
}

export interface AIMessageRepository {
  create(input: {
    conversationId: string;
    role: AIMessageRole;
    content: string;
    sourceReferences: SourceReference[] | null;
    answerOrigin?: AIAnswerOrigin | null;
  }): Promise<AIMessage>;
  listByConversation(conversationId: string): Promise<AIMessage[]>;
  /** Últimos N turnos, más recientes primero — para historial conversacional (§6.2). */
  listRecentByConversation(conversationId: string, limit: number): Promise<AIMessage[]>;
}

export interface CachedAnswer {
  id: string;
  answerContent: string;
  sourceReferences: SourceReference[];
}

export interface SaveCachedAnswerInput {
  questionText: string;
  embedding: number[];
  answerContent: string;
  sourceReferences: SourceReference[];
  /** Procedures citados en la respuesta — permite invalidar por Procedure editado/depreciado. */
  procedureIds: string[];
}

// Memoria semántica del chat (AICachedAnswer) — un caché de preguntas/
// respuestas ya resueltas, para no volver a llamar al LLM (el cuello de
// botella real de latencia) ante una pregunta prácticamente igual a una ya
// respondida. Ver ask-ai.ts (prepareAskAI/completeAskAI) y PgAnswerCacheStore.
export interface AnswerCacheStore {
  /** null si no hay ninguna entrada con similitud >= minSimilarity (o está vencida por TTL). */
  findSimilar(embedding: number[], minSimilarity: number): Promise<CachedAnswer | null>;
  save(input: SaveCachedAnswerInput): Promise<void>;
  recordHit(id: string): Promise<void>;
  /** Borra toda entrada de caché que cite este Procedure (edición/depreciación de contenido). */
  invalidateByProcedureId(procedureId: string): Promise<void>;
}

export function withMessages(
  conversation: AIConversation,
  messages: AIMessage[],
): AIConversationWithMessages {
  return { ...conversation, messages };
}

// Lectura de solo-consulta sobre Knowledge para indexación — patrón
// "CQRS ligero" ya documentado en ARCHITECTURE.md §8 (lecturas de otros
// agregados sin pasar por sus repositorios de escritura). Devuelve null si
// la fuente no existe.
export interface IndexableContent {
  sourceType: DocumentChunkSourceType;
  /** Para procedure_version: todas las versiones de ESE procedimiento (para borrar las viejas antes de reindexar). */
  siblingSourceIds: string[];
  title: string;
  markdown: string;
  categoryId: string | null;
}

export interface SourceContentReader {
  read(sourceType: DocumentChunkSourceType, sourceId: string): Promise<IndexableContent | null>;
}
