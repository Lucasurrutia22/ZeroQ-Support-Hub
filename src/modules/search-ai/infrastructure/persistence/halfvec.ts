// Serialización de un embedding a literal `halfvec` de pgvector — compartido
// por PgVectorStore (DocumentChunk) y PgAnswerCacheStore (AICachedAnswer),
// los dos únicos lugares del proyecto que escriben SQL raw contra columnas
// `halfvec(1024)`.
export function toHalfvecLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
