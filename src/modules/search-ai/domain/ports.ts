// Ports & Adapters (ARCHITECTURE.md §8) del contexto Search & AI. Cada
// interface se implementa en infrastructure/ — el dominio y los use cases
// nunca importan un SDK de IA ni Prisma directamente.

import type {
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
  clientId: string | null;
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
  /** Sin enriquecer (sin citationTag/sourceTitle) — VectorStore no conoce Knowledge/Cases. */
  hybridSearch(input: HybridSearchInput): Promise<ScoredChunk[]>;
}

export interface GenerateAnswerInput {
  systemPrompt: string;
  query: string;
  chunks: RankedChunk[];
  /** Últimos turnos de la conversación (sin chunks) para coherencia conversacional — AI_RAG_DESIGN.md §6.2. */
  history: { role: AIMessageRole; content: string }[];
}

// LLM — el port que debe poder apuntar a Claude, OpenAI, Ollama o Azure
// OpenAI sin que AskAIUseCase sepa cuál está activo (pedido explícito del
// usuario). Un solo método: recibe el contexto ya recuperado y arma la
// respuesta estructurada (AskAIStructuredAnswer, AI_RAG_DESIGN.md §4.2).
export interface LLMProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<AskAIStructuredAnswer>;
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
  }): Promise<AIMessage>;
  listByConversation(conversationId: string): Promise<AIMessage[]>;
  /** Últimos N turnos, más recientes primero — para historial conversacional (§6.2). */
  listRecentByConversation(conversationId: string, limit: number): Promise<AIMessage[]>;
}

export function withMessages(
  conversation: AIConversation,
  messages: AIMessage[],
): AIConversationWithMessages {
  return { ...conversation, messages };
}

// Lectura de solo-consulta sobre Knowledge/Cases para indexación — patrón
// "CQRS ligero" ya documentado en ARCHITECTURE.md §8 (lecturas de otros
// agregados sin pasar por sus repositorios de escritura). Devuelve null si
// la fuente no existe o si Cases todavía no tiene contenido indexable
// (ej. un ResolvedCase sin solution, invariante que ya impide crearlo vacío).
export interface IndexableContent {
  sourceType: DocumentChunkSourceType;
  /** Para procedure_version: todas las versiones de ESE procedimiento (para borrar las viejas antes de reindexar). */
  siblingSourceIds: string[];
  title: string;
  markdown: string;
  categoryId: string | null;
  clientId: string | null;
}

export interface SourceContentReader {
  read(sourceType: DocumentChunkSourceType, sourceId: string): Promise<IndexableContent | null>;
}
