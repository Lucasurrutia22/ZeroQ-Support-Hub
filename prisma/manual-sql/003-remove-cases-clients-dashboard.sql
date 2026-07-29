-- Aplicado a mano el 2026-07-29 contra la base real de Supabase (fuera del
-- historial de migraciones de Prisma — mismo criterio que pre/post-migrate.sql:
-- `prisma migrate dev` habría intentado además borrar el índice HNSW, el
-- índice GIN y la columna generada "contentSearch" por verlos como "drift"
-- no declarado en schema.prisma, rompiendo la búsqueda híbrida ya funcionando
-- con datos reales. Este script NO toca ninguno de esos tres).
--
-- Motivo: eliminación completa del módulo Cases + Clients (Casos Resueltos,
-- Clientes, Infraestructura, Evidencias/Logs) — sin uso real, pedido
-- explícito del usuario. Las 5 tablas estaban vacías (0 filas, verificado
-- antes de aplicar) — sin pérdida de datos.

BEGIN;

DROP TABLE "Attachment";
DROP TABLE "CaseProcedure";
DROP TABLE "ResolvedCase";
DROP TABLE "InfrastructureAsset";
DROP TABLE "Client";

DROP TYPE "AssetType";
DROP TYPE "AttachmentFileType";
DROP TYPE "ClientType";

DROP INDEX "DocumentChunk_clientId_idx";
ALTER TABLE "DocumentChunk" DROP COLUMN "clientId";

-- Enum shrink: DocumentChunkSourceType pierde "resolved_case" (0 filas lo
-- usaban, verificado antes de aplicar — la única fuente indexable ahora es
-- procedure_version).
CREATE TYPE "DocumentChunkSourceType_new" AS ENUM ('procedure_version');
ALTER TABLE "DocumentChunk"
  ALTER COLUMN "sourceType" TYPE "DocumentChunkSourceType_new"
  USING ("sourceType"::text::"DocumentChunkSourceType_new");
ALTER TYPE "DocumentChunkSourceType" RENAME TO "DocumentChunkSourceType_old";
ALTER TYPE "DocumentChunkSourceType_new" RENAME TO "DocumentChunkSourceType";
DROP TYPE "DocumentChunkSourceType_old";

COMMIT;
