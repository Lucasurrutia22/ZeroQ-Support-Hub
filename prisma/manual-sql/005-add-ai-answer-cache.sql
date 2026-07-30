-- Memoria semántica del asistente de IA (AICachedAnswer/AICachedAnswerCitation)
-- + AIMessage.answerOrigin. Aplicado a mano siguiendo el flujo de README.md:
-- generado a partir de `npx prisma migrate diff --from-config-datasource
-- --to-schema prisma/schema.prisma --script`, tomando SOLO las líneas nuevas
-- reales y agregando a mano la columna `embedding` (Prisma ignora los campos
-- Unsupported en el diff — igual que pasó con DocumentChunk.embedding en su
-- momento) y su índice HNSW. Las líneas de "DROP INDEX .../DROP COLUMN
-- contentSearch" que también salieron en el diff son drift falso (HNSW/GIN/
-- contentSearch existentes) y NUNCA deben aplicarse.

BEGIN;

CREATE TYPE "AIAnswerOrigin" AS ENUM ('cache', 'quick', 'deep');

ALTER TABLE "AIMessage" ADD COLUMN "answerOrigin" "AIAnswerOrigin";

CREATE TABLE "AICachedAnswer" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerContent" TEXT NOT NULL,
    "sourceReferences" JSONB NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICachedAnswer_pkey" PRIMARY KEY ("id")
);

-- Unsupported("halfvec(1024)") en el schema — Prisma no genera esta columna
-- en el diff, se agrega a mano (mismo motivo que DocumentChunk.embedding).
ALTER TABLE "AICachedAnswer" ADD COLUMN "embedding" halfvec(1024);

CREATE TABLE "AICachedAnswerCitation" (
    "id" TEXT NOT NULL,
    "cachedAnswerId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,

    CONSTRAINT "AICachedAnswerCitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AICachedAnswerCitation_procedureId_idx" ON "AICachedAnswerCitation"("procedureId");

ALTER TABLE "AICachedAnswerCitation" ADD CONSTRAINT "AICachedAnswerCitation_cachedAnswerId_fkey"
  FOREIGN KEY ("cachedAnswerId") REFERENCES "AICachedAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- CONCURRENTLY no puede correr dentro de una transacción — se aplica aparte,
-- después del COMMIT de arriba (mismo orden que post-migrate.sql original).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ai_cached_answer_embedding_hnsw_idx"
  ON "AICachedAnswer"
  USING hnsw ("embedding" halfvec_cosine_ops);
