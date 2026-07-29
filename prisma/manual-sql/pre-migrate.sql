-- Correr UNA VEZ antes de "prisma migrate dev" / "prisma db push" contra la
-- base real de Supabase. Sin esto, la migración falla al intentar crear la
-- columna "embedding" halfvec(1024) de DocumentChunk (tipo Unsupported en
-- schema.prisma) porque el tipo halfvec todavía no existe en la base.

CREATE EXTENSION IF NOT EXISTS vector;
