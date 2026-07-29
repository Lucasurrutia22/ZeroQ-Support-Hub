# SQL manual — pasos que Prisma no puede expresar

Prisma 7 no modela nativamente: extensiones de PostgreSQL, tipos `vector`/`halfvec`, índices
`HNSW`, columnas generadas (`GENERATED ALWAYS AS`), ni `CHECK` constraints (`@@check`). Estos pasos
se documentan acá y se aplican a mano — mismo patrón ya usado para el `CHECK` de `Attachment`
(ver `prisma/schema.prisma`, modelo `Attachment`).

Como todavía no se corrió ninguna migración en este proyecto (bloqueado por credenciales de
Supabase, ver memoria del proyecto), no existe carpeta `prisma/migrations/` — estos archivos se
aplican **una sola vez**, en este orden, la primera vez que se levante la base de datos real:

1. **`pre-migrate.sql`** — antes de `prisma migrate dev` / `prisma db push`. Crea la extensión
   `vector`, que el tipo `Unsupported("halfvec(1024)")` de `DocumentChunk.embedding` necesita para
   existir en la base antes de que Prisma intente crear esa columna.
2. `prisma migrate dev` (o `db push`) — crea todas las tablas, incluida `DocumentChunk` con la
   columna `embedding` ya tipada `halfvec(1024)` (nullable, ver comentario en `schema.prisma`).
3. **`post-migrate.sql`** — después de la migración. Agrega: el índice HNSW sobre `embedding`, la
   columna generada `content_search` (`tsvector`) + su índice GIN para el retrieval híbrido
   (`AI_RAG_DESIGN.md` §5), y el `CHECK` pendiente de `Attachment` (ya documentado, nunca aplicado
   por el mismo bloqueo de credenciales).

**Por qué no van dentro de una migración Prisma normal:** correr `prisma migrate dev` con SQL
manual mezclado requeriría convertir la migración inicial completa en un archivo editado a mano
(perdiendo el tracking automático de Prisma para el resto del schema). Mantenerlos separados deja
que Prisma siga siendo la fuente de verdad para todo lo que sí puede expresar, y estos dos archivos
son el complemento explícito para lo que no puede.
