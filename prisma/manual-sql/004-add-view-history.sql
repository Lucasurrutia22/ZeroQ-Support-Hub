-- Aplicado a mano el 2026-07-29 (mismo motivo que 003: `prisma migrate diff`
-- también quería borrar el índice HNSW/GIN y la columna "contentSearch" al
-- verlos como drift no declarado). Se aplicó solo el subconjunto real del
-- diff (crear el enum, la tabla, sus índices y su FK), nada más.

BEGIN;

CREATE TYPE "ViewedEntityType" AS ENUM ('procedure', 'document');

CREATE TABLE "ViewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "ViewedEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViewHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViewHistory_userId_viewedAt_idx" ON "ViewHistory"("userId", "viewedAt");
CREATE UNIQUE INDEX "ViewHistory_userId_entityType_entityId_key" ON "ViewHistory"("userId", "entityType", "entityId");
ALTER TABLE "ViewHistory" ADD CONSTRAINT "ViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
