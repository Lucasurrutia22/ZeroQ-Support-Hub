-- Correr UNA VEZ después de la primera "prisma migrate dev" / "prisma db
-- push" contra la base real de Supabase. Nombres de tabla/columna
-- verificados contra la salida real de:
--   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- (no a mano — evita el desajuste de casing que tenía la nota original del
-- CHECK de Attachment, escrita en snake_case cuando Prisma genera camelCase
-- entre comillas dobles al no usar @map/@@map en estos modelos).

-- 1) CHECK pendiente de Attachment (documentado desde la Fase Support,
--    nunca aplicado por el mismo bloqueo de credenciales): exactamente uno
--    de "procedureId"/"caseId" debe ser no-nulo.
ALTER TABLE "Attachment"
  ADD CONSTRAINT "attachment_exactly_one_owner_chk"
  CHECK (num_nonnulls("procedureId", "caseId") = 1);

-- 2) Índice HNSW sobre el embedding de DocumentChunk — golden path de la
--    skill pgvector-semantic-search: halfvec + cosine + HNSW por defecto.
--    Se crea CONCURRENTLY para no bloquear escrituras (aunque en esta etapa
--    la tabla está vacía, se deja el patrón correcto para producción).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "document_chunk_embedding_hnsw_idx"
  ON "DocumentChunk"
  USING hnsw ("embedding" halfvec_cosine_ops);

-- 3) Columna generada tsvector + índice GIN para el lado "texto completo"
--    del retrieval híbrido (AI_RAG_DESIGN.md §5: vector + full-text, fusión
--    por Reciprocal Rank Fusion). 'spanish' porque el contenido de ZeroQ es
--    mayoritariamente en español (procedimientos, casos); algunos manuales
--    de fabricante en inglés pierden algo de recall en el lado full-text,
--    aceptable porque Document no se indexa en este alcance de todos modos.
ALTER TABLE "DocumentChunk"
  ADD COLUMN "contentSearch" tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', "content")) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "document_chunk_content_search_gin_idx"
  ON "DocumentChunk"
  USING gin ("contentSearch");

-- 4) ef_search de consulta — punto de partida razonable (skill
--    pgvector-semantic-search), ajustar según latencia/recall medidos una
--    vez haya corpus real. No es persistente (SET, no ALTER SYSTEM);
--    considerar moverlo a postgresql.conf o a la sesión de PgVectorStore si
--    hace falta que sea consistente entre conexiones del pool.
-- SET hnsw.ef_search = 100;
