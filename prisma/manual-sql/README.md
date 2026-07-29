# SQL manual — pasos que Prisma no puede expresar

Prisma 7 no modela nativamente: extensiones de PostgreSQL, tipos `vector`/`halfvec`, índices
`HNSW`, columnas generadas (`GENERATED ALWAYS AS`), ni `CHECK` constraints (`@@check`). Estos pasos
se documentan acá y se aplican a mano — mismo patrón ya usado para el `CHECK` de `Attachment`
(ver `prisma/schema.prisma`, modelo `Attachment`).

Estos dos primeros archivos se aplicaron **una sola vez**, en este orden, la primera vez que se
levantó la base de datos real (2026-07-28):

1. **`pre-migrate.sql`** — antes de `prisma migrate dev` / `prisma db push`. Crea la extensión
   `vector`, que el tipo `Unsupported("halfvec(1024)")` de `DocumentChunk.embedding` necesita para
   existir en la base antes de que Prisma intente crear esa columna.
2. `prisma migrate dev` (o `db push`) — crea todas las tablas, incluida `DocumentChunk` con la
   columna `embedding` ya tipada `halfvec(1024)` (nullable, ver comentario en `schema.prisma`).
3. **`post-migrate.sql`** — después de la migración. Agrega: el índice HNSW sobre `embedding` y la
   columna generada `contentSearch` (`tsvector`) + su índice GIN para el retrieval híbrido
   (`AI_RAG_DESIGN.md` §5). El CHECK de `Attachment` que este archivo documentaba quedó sin efecto:
   el modelo `Attachment` se eliminó junto con el módulo Cases (ver punto 4).
4. **`003-remove-cases-clients-dashboard.sql`** (2026-07-29) — eliminación del módulo Cases +
   Clients (sin uso real). Aplicado directo con `pg.Client`, nunca con `prisma migrate dev`: ese
   comando detecta el índice HNSW/GIN y la columna `contentSearch` como "drift" no declarado en
   `schema.prisma` (viven fuera del historial de migraciones de Prisma) e intenta borrarlos para
   "sincronizar" — este script hace exactamente lo que hace falta y nada más.

**Importante para cualquier cambio de schema futuro:** por lo mismo, `npx prisma migrate dev` no es
seguro de correr en este proyecto tal cual — siempre previsualizar con
`npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` primero
y aplicar a mano solo las líneas relevantes (nunca lo que toque `contentSearch` o los índices
HNSW/GIN), replicando el patrón de este directorio.

**Por qué no van dentro de una migración Prisma normal:** correr `prisma migrate dev` con SQL
manual mezclado requeriría convertir la migración inicial completa en un archivo editado a mano
(perdiendo el tracking automático de Prisma para el resto del schema). Mantenerlos separados deja
que Prisma siga siendo la fuente de verdad para todo lo que sí puede expresar, y estos dos archivos
son el complemento explícito para lo que no puede.
