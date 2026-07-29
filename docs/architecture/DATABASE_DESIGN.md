# ZeroQ Support Hub — Diseño de Base de Datos

**Estado:** Propuesta de diseño (Fase 1) — no se ha escrito `schema.prisma` real ni código de
aplicación. Este documento es el pseudocódigo de referencia que se traducirá 1:1 a
`prisma/schema/*.prisma` cuando arranque implementación.
**Autor:** Database Engineer (Claude)
**Fecha:** 2026-07-23
**Fuente de verdad:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — este documento no reabre D1–D7, los
implementa a nivel de esquema.
**Motor:** PostgreSQL 16+ con extensión `vector` (pgvector ≥ 0.8.0). ORM: Prisma (ver §6 para
versión y convenciones de CLI verificadas).

---

## 0. Convenciones generales

| Decisión | Elección | Nota |
|---|---|---|
| Nombres de tabla/columna | `PascalCase` para modelos, `camelCase` para campos (convención Prisma estándar); Prisma mapea a `snake_case`/nombres tal cual en Postgres salvo `@@map`/`@map` explícito | No se usa `@@map` en este borrador — se asume que los nombres de modelo tal cual son aceptables como nombres de tabla. **Requiere validación** si el equipo prefiere `snake_case` nativo en Postgres. |
| Primary keys | `String @id @default(cuid())` en todos los agregados/entidades, salvo tablas de join puras (PK compuesta) | Alternativas descartadas: `autoincrement()` (expone volumen de datos, mala DX en joins de dominio), `uuid()` (aceptable, cuid es más corto y ordenable por tiempo de creación, útil para paginación). **Requiere validación explícita** — es una elección de la fase de diseño, no una decisión ya cerrada en ARCHITECTURE.md. |
| Timestamps | `createdAt DateTime @default(now())` en todas las entidades; `updatedAt DateTime @updatedAt` en las que son editables tras creación | ARCHITECTURE.md §5.2 no lista `updatedAt` en varias entidades (Category, Client, Comment, InfrastructureAsset...) — se agrega aquí por ser mutables. Ver §7. |
| Borrado | Ningún modelo usa borrado físico por defecto; entidades con ciclo de vida binario tienen `active`/`status` (`User.active`, `Client.active`, `Procedure.status = deprecated`) | Category, Tag, Document, Attachment no tienen campo de "desactivado" — su borrado real (¿soft-delete? ¿hard-delete con `ON DELETE RESTRICT`?) no está definido en ARCHITECTURE.md. Ver §7. |
| Multi-schema físico | Un archivo `.prisma` por bounded context bajo `prisma/schema/`, mergeados automáticamente por el CLI (soportado por Prisma cuando `schema` en `prisma.config.ts` apunta a una carpeta) | Refleja el mismo principio Screaming Architecture de `src/modules/*` (ARCHITECTURE.md §6). Cada bloque de código de este documento = un archivo futuro. |
| Longitudes de campo (`VarChar(n)` vs `String` sin límite) | Sin límite explícito (`String` plano, Postgres `text`) salvo donde se indica | Postgres no penaliza `text` sin límite; se documenta como **requiere validación** si Product quiere límites duros a nivel DB (ej. `title` de Procedure a 200 caracteres) en vez de solo validación Zod en el borde. |

---

## 1. Extensión de PostgreSQL requerida

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Decisión de sintaxis Prisma (verificada contra la documentación actual de Prisma, no de memoria):**
Prisma soporta dos caminos para pgvector:

- **Opción A — `Unsupported("vector(1024)")` (elegida, por instrucción explícita de Fase 1 y D1):**
  el campo se declara como tipo no soportado, Prisma lo trata como texto opaco a nivel de Client
  (no se puede leer/escribir vía `prisma.documentChunk.create()` normal), y **todo** el acceso pasa
  por `$queryRaw` dentro de `PgVectorStore` (ya así en ARCHITECTURE.md D1). No requiere
  `previewFeatures = ["postgresqlExtensions"]` ni declarar la extensión en el bloque `datasource`
  — el `CREATE EXTENSION` se agrega a mano en la migración inicial (§6.2). Esta es la opción de este
  documento.
- **Opción B — tipo nativo mapeado (`Vector1024`) vía `previewFeatures = ["postgresqlExtensions"]`
  + `extensions = [vector]` en `datasource` + mapeo de tipo custom en `prisma.config.ts`
  (`experimental.extensions: true`):** existe en Prisma 7.6.0 pero es **experimental** — permite
  incluso declarar `@@index(..., type: Hnsw, ops: ...)` nativamente en el schema. **No se adopta
  ahora** por ser experimental y porque el resto del acceso a `document_chunks` ya pasa por raw SQL
  de todos modos (D1) — adoptar la Opción B no simplifica nada hoy y ata el proyecto a una feature
  que puede cambiar de forma incompatible. Queda anotado como camino de evolución futuro, no como
  decisión pendiente urgente.

---

## 2. Schema en pseudocódigo, por Bounded Context

### 2.1 Identity (`prisma/schema/identity.prisma`)

```prisma
enum UserRole {
  admin
  supervisor
  engineer_l1
  engineer_l2
  readonly
}

model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  passwordHash       String
  role               UserRole
  active             Boolean   @default(true)
  mustChangePassword Boolean   @default(false) // ver §5 seed inicial — requiere validación, campo no está en ARCHITECTURE.md §5.2
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Knowledge
  authoredProcedures      Procedure[]        @relation("ProcedureAuthor")
  authoredVersions        ProcedureVersion[] @relation("ProcedureVersionAuthor")
  reviewRequestsRequested ReviewRequest[]    @relation("ReviewRequestedBy")
  reviewRequestsReviewed  ReviewRequest[]    @relation("ReviewReviewer")
  comments                Comment[]          @relation("CommentAuthor")
  uploadedDocuments       Document[]         @relation("DocumentUploadedBy")
  uploadedAttachments     Attachment[]       @relation("AttachmentUploadedBy")

  // Cases
  resolvedCases           ResolvedCase[]     @relation("CaseEngineer")

  // Engagement
  favorites               Favorite[]
  viewHistory             ViewHistory[]

  // Analytics
  auditLogs               AuditLog[]

  // Search & AI
  aiConversations         AIConversation[]

  @@index([role])
  @@index([active])
}
```

> Nota de diseño: un usuario tiene **un** `role` obligatorio no-nulo (invariante del agregado `User`,
> ver §5.1 de ARCHITECTURE.md) — se enforced trivialmente por ser columna `NOT NULL` de tipo enum,
> sin necesidad de tabla de roles ni tabla puente (coherente con D4: roles fijos, sin RBAC dinámico).

### 2.2 Knowledge (`prisma/schema/knowledge.prisma`)

```prisma
enum ProcedureStatus {
  draft
  in_review
  approved
  deprecated
}

enum RiskLevel {
  low
  medium
  high
}

enum ReviewStatus {
  pending
  approved
  rejected
}

enum AttachmentFileType {
  image
  video
  pdf
  config
  log
}

enum DocumentFileType {
  manual
  datasheet
  firmware_notes
  otro
}

model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  parentId    String?
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")

  procedures    Procedure[]
  resolvedCases ResolvedCase[]
  documents     Document[]

  @@index([parentId])
}

model Procedure {
  id                   String          @id @default(cuid())
  title                String
  slug                 String          @unique
  categoryId           String
  status               ProcedureStatus @default(draft)
  riskLevel            RiskLevel
  estimatedTimeMinutes Int?
  currentVersionId     String?         @unique // FK circular controlada, ver nota abajo
  authorId             String
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  category       Category           @relation(fields: [categoryId], references: [id])
  author         User               @relation("ProcedureAuthor", fields: [authorId], references: [id])
  currentVersion ProcedureVersion?  @relation("ProcedureCurrentVersion", fields: [currentVersionId], references: [id])
  versions       ProcedureVersion[] @relation("ProcedureVersions")
  reviewRequests ReviewRequest[]
  comments       Comment[]
  attachments    Attachment[]
  tags           ProcedureTag[]
  favorites      Favorite[]
  cases          CaseProcedure[]

  @@index([categoryId])
  @@index([status])
  @@index([authorId])
}

model ProcedureVersion {
  id              String   @id @default(cuid())
  procedureId     String
  versionNumber   Int
  contentMarkdown String   @db.Text
  changeSummary   String?
  authorId        String
  createdAt       DateTime @default(now())

  procedure Procedure @relation("ProcedureVersions", fields: [procedureId], references: [id])
  author    User      @relation("ProcedureVersionAuthor", fields: [authorId], references: [id])
  currentOf Procedure? @relation("ProcedureCurrentVersion")
  // Nota: NO hay relación tipada hacia DocumentChunk — DocumentChunk.sourceId es polimórfico
  // (sourceType discrimina la tabla). Ver §5 y §7.

  @@unique([procedureId, versionNumber])
  @@index([procedureId])
}

model ReviewRequest {
  id          String       @id @default(cuid())
  procedureId String
  requestedBy String
  reviewerId  String?
  status      ReviewStatus @default(pending)
  notes       String?
  reviewedAt  DateTime?
  createdAt   DateTime     @default(now())

  procedure Procedure @relation(fields: [procedureId], references: [id])
  requester User      @relation("ReviewRequestedBy", fields: [requestedBy], references: [id])
  reviewer  User?     @relation("ReviewReviewer", fields: [reviewerId], references: [id])

  @@index([procedureId])
  @@index([status])
  @@index([reviewerId])
}

model Comment {
  id          String   @id @default(cuid())
  procedureId String
  authorId    String
  body        String   @db.Text
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())

  procedure Procedure @relation(fields: [procedureId], references: [id])
  author    User      @relation("CommentAuthor", fields: [authorId], references: [id])

  @@index([procedureId])
}

model Tag {
  id   String @id @default(cuid())
  name String @unique

  procedures ProcedureTag[]
}

model ProcedureTag {
  procedureId String
  tagId       String

  procedure Procedure @relation(fields: [procedureId], references: [id])
  tag       Tag       @relation(fields: [tagId], references: [id])

  @@id([procedureId, tagId])
  @@index([tagId])
}

// --- Attachment: DESVIACIÓN deliberada del borrador polimórfico ownerType/ownerId de
// ARCHITECTURE.md §5.2. Prisma/Postgres no modelan FKs polimórficas de forma segura (una columna
// no puede apuntar a "Procedure o ResolvedCase" con integridad referencial real). Se reemplaza
// por dos FKs nullable + un CHECK a nivel DB que exige exactamente una no-nula. Ver §5 y §7 —
// marcado como REQUIERE VALIDACIÓN del Arquitecto Principal porque cambia la forma del dato
// respecto al borrador aprobado.
model Attachment {
  id          String             @id @default(cuid())
  procedureId String?
  caseId      String?
  fileType    AttachmentFileType
  storageKey  String
  uploadedBy  String
  createdAt   DateTime           @default(now())

  procedure Procedure?    @relation(fields: [procedureId], references: [id])
  case      ResolvedCase? @relation(fields: [caseId], references: [id])
  uploader  User          @relation("AttachmentUploadedBy", fields: [uploadedBy], references: [id])

  @@index([procedureId])
  @@index([caseId])
  // CHECK (num_nonnulls(procedure_id, case_id) = 1) -- agregado a mano en la migración, ver §6.2
}

model Document {
  id           String           @id @default(cuid())
  title        String
  categoryId   String
  clientId     String?
  fileType     DocumentFileType
  storageKey   String
  uploadedBy   String
  supersedesId String?          @unique
  createdAt    DateTime         @default(now())

  category     Category  @relation(fields: [categoryId], references: [id])
  client       Client?   @relation(fields: [clientId], references: [id])
  uploader     User      @relation("DocumentUploadedBy", fields: [uploadedBy], references: [id])
  supersedes   Document? @relation("DocumentSupersedes", fields: [supersedesId], references: [id])
  supersededBy Document? @relation("DocumentSupersedes")

  @@index([categoryId])
  @@index([clientId])
}
```

> **Nota sobre la FK circular `Procedure.currentVersionId ↔ ProcedureVersion.procedureId`:** es un
> patrón estándar de "puntero a la versión vigente" — se resuelve porque `currentVersionId` es
> nullable, así que el orden de inserción es: (1) crear `Procedure` sin `currentVersionId`, (2) crear
> la primera `ProcedureVersion`, (3) `UPDATE Procedure SET currentVersionId = ...`. No requiere
> preview feature ni SQL manual, es circularidad normal de Prisma con FK opcional.

### 2.3 Cases (`prisma/schema/cases.prisma`)

```prisma
model ResolvedCase {
  id                    String   @id @default(cuid())
  title                 String
  description           String   @db.Text
  clientId              String?
  infrastructureAssetId String?
  categoryId            String
  engineerId            String
  symptoms              String   @db.Text
  rootCause             String   @db.Text
  solution              String   @db.Text // NOT NULL: invariante "no puede crearse vacío de solution"
  timeSpentMinutes      Int?
  resolvedAt            DateTime
  createdAt             DateTime @default(now())

  client              Client?              @relation(fields: [clientId], references: [id])
  infrastructureAsset InfrastructureAsset? @relation(fields: [infrastructureAssetId], references: [id])
  category            Category             @relation(fields: [categoryId], references: [id])
  engineer            User                 @relation("CaseEngineer", fields: [engineerId], references: [id])
  attachments         Attachment[]
  procedures          CaseProcedure[]

  @@index([clientId])
  @@index([infrastructureAssetId])
  @@index([categoryId])
  @@index([engineerId])
  @@index([resolvedAt])
}

model CaseProcedure {
  caseId      String
  procedureId String

  case      ResolvedCase @relation(fields: [caseId], references: [id])
  procedure Procedure    @relation(fields: [procedureId], references: [id])

  @@id([caseId, procedureId])
  @@index([procedureId])
}
```

### 2.4 Clients (`prisma/schema/clients.prisma`)

```prisma
enum ClientType {
  banco
  hospital
  municipalidad
  retail
  gobierno
  otro
}

enum AssetType {
  totem
  modulo_atencion
  pantalla
  impresora
  servidor
  tv_box
  otro
}

model Client {
  id          String     @id @default(cuid())
  name        String
  type        ClientType
  contactInfo Json?
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  assets        InfrastructureAsset[]
  resolvedCases ResolvedCase[]
  documents     Document[]

  @@index([type])
  @@index([active])
}

model InfrastructureAsset {
  id           String    @id @default(cuid())
  clientId     String    // NOT NULL: invariante "un asset siempre pertenece a un client"
  type         AssetType
  model        String?
  location     String?
  serialNumber String?
  metadata     Json?     // estructura no tipada por tipo de activo — ver §7
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  client        Client         @relation(fields: [clientId], references: [id])
  resolvedCases ResolvedCase[]

  @@index([clientId])
  @@index([type])
}
```

### 2.5 Engagement (`prisma/schema/engagement.prisma`)

```prisma
enum ViewEntityType {
  procedure
  case
  document
  client
}

model Favorite {
  userId      String
  procedureId String
  createdAt   DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id])
  procedure Procedure @relation(fields: [procedureId], references: [id])

  @@id([userId, procedureId])
  @@index([procedureId])
}

// Polimórfico por diseño (a diferencia de Attachment) — ver justificación en §5/§7:
// es un log de interacción de solo lectura/append, no protege un invariante de negocio crítico,
// así que el costo de una FK real (join table o columnas separadas por entidad) no se justifica.
model ViewHistory {
  id         String         @id @default(cuid())
  userId     String
  entityType ViewEntityType
  entityId   String
  viewedAt   DateTime       @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, viewedAt])
  @@index([entityType, entityId])
}
```

### 2.6 Analytics (`prisma/schema/analytics.prisma`)

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?  // nullable: acciones de sistema/jobs sin actor humano — ver §7
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### 2.7 Search & AI (`prisma/schema/search-ai.prisma`)

```prisma
enum AIMessageRole {
  user
  assistant
}

enum ChunkSourceType {
  procedure_version
  resolved_case
  document
}

model AIConversation {
  id        String   @id @default(cuid())
  userId    String
  title     String?
  createdAt DateTime @default(now())

  user     User        @relation(fields: [userId], references: [id])
  messages AIMessage[]

  @@index([userId])
}

model AIMessage {
  id               String        @id @default(cuid())
  conversationId   String
  role             AIMessageRole
  content          String        @db.Text
  sourceReferences Json?         // array de {type, id, title} — ver invariante en §5
  createdAt        DateTime      @default(now())

  conversation AIConversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId])
  // CHECK (role <> 'assistant' OR source_references IS NOT NULL) -- agregado a mano, ver §6.2
}

// sourceId es polimórfico (procedure_version | resolved_case | document, discriminado por
// sourceType) — no hay FK tipada real hacia Procedure/ResolvedCase/Document. Ver §5 y §7.
model DocumentChunk {
  id         String                       @id @default(cuid())
  sourceType ChunkSourceType
  sourceId   String
  content    String                       @db.Text
  embedding  Unsupported("vector(1024)")  // D2: Voyage voyage-3, 1024 dims
  chunkIndex Int
  categoryId String?                      // denormalizado del source, para prefiltrar antes del vector search (zeroq-rag §4)
  clientId   String?                      // idem, solo aplica a chunks de ResolvedCase
  createdAt  DateTime                     @default(now())

  @@index([sourceType, sourceId])
  @@index([categoryId])
  @@index([clientId])
  // Índice HNSW sobre `embedding` y columna generada `content_tsv` + GIN NO son expresables
  // sobre un campo Unsupported en schema.prisma — se agregan a mano en la migración. Ver §3.2/§6.2.
}
```

---

## 3. Estrategia de índices

### 3.1 Índices btree (declarados arriba, resumen)

| Tabla | Columna(s) | Motivo |
|---|---|---|
| Todas las FK de un solo lado (`categoryId`, `authorId`, `clientId`, `procedureId`, etc.) | btree simple | Toda FK que se usa en `WHERE`/`JOIN` frecuente necesita índice — Postgres no lo crea automático salvo en el lado `UNIQUE`/PK. |
| `Procedure.slug`, `Category.slug`, `Tag.name`, `User.email` | btree único (`@unique`) | Lookup por slug/email es el patrón de acceso principal de la UI (rutas `/procedures/[slug]`). |
| `Procedure.status`, `Client.active`, `User.role`, `User.active` | btree simple | Filtros de listado de alta frecuencia (dashboard, listados admin). |
| `ResolvedCase.resolvedAt`, `AuditLog.createdAt` | btree simple | Ordenamiento cronológico + filtros de rango en dashboard/auditoría. |
| `ReviewRequest.status`, `ReviewRequest.reviewerId` | btree simple | Bandeja de revisiones pendientes por supervisor. |
| `ViewHistory(userId, viewedAt)`, `ViewHistory(entityType, entityId)` | compuestos | "Historial reciente del usuario" y "quién vio esta entidad" son los dos patrones de consulta. |
| `AuditLog(entityType, entityId)` | compuesto | Timeline de auditoría por entidad específica. |
| `DocumentChunk(sourceType, sourceId)` | compuesto | Borrar/reindexar todos los chunks de una fuente al aprobar nueva versión (zeroq-rag: "borrar chunks de la versión superada"). |

### 3.2 Índice de similarity search — `document_chunks.embedding`

**Elección: HNSW, no IVFFlat**, con operador coseno. Justificación (según skill
`pgvector-semantic-search`, sección "Golden Path"): HNSW da mejor trade-off velocidad/recall, no
necesita paso de entrenamiento y puede crearse sobre tabla vacía — IVFFlat solo se preferiría en
escenarios write-heavy con reconstrucción frecuente de índice, que no es el patrón de este
proyecto (los chunks se re-generan por versión aprobada, no por escritura continua de alto volumen).

```sql
-- Migración manual (ver §6.2) — se ejecuta DESPUÉS de la carga inicial si hay bulk load,
-- o directamente si la tabla empieza vacía (HNSW no lo requiere, a diferencia de IVFFlat).
CREATE INDEX document_chunk_embedding_hnsw_idx
  ON "DocumentChunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

Parámetros de consulta (ajustados por `PgVectorStore.similaritySearch`):

```sql
SET LOCAL hnsw.ef_search = 100; -- punto de partida recomendado por el golden path; subir si el recall en producción resulta insuficiente
SELECT id, "sourceType", "sourceId", content, "chunkIndex"
FROM "DocumentChunk"
WHERE ("categoryId" = $1 OR $1 IS NULL) -- prefiltro antes del ANN cuando el contexto de UI lo permite (zeroq-rag §4)
ORDER BY embedding <=> $2::vector(1024)
LIMIT 8;
```

**Nota sobre `halfvec`:** la skill `pgvector-semantic-search` recomienda `halfvec(N)` en vez de
`vector(N)` como default (50% menos storage/índice, pérdida de recall mínima). Este documento se
queda con `vector(1024)` porque así lo fija explícitamente la instrucción de esta fase de diseño y
D2 de ARCHITECTURE.md. **Se marca como optimización futura pendiente de validación** (§7): migrar
la columna a `halfvec(1024)` es un cambio de tipo de columna de bajo riesgo una vez haya volumen
real que lo justifique, sin tocar el resto del modelo.

Filtros por `categoryId`/`clientId` bajo alta selectividad pueden requerir `SET hnsw.iterative_scan
= relaxed_order;` si el volumen de chunks por categoría crece lo suficiente para que HNSW corte la
búsqueda antes de encontrar `LIMIT` resultados tras el filtro (ver skill, sección "Filtering Best
Practices") — no se activa por defecto en el MVP, se documenta como palanca de tuning disponible.

### 3.3 Full-text search — hybrid search

Para combinar con el vector search (Reciprocal Rank Fusion, ver skill `zeroq-rag` §4), se agrega
una columna generada `tsvector` + índice GIN sobre `DocumentChunk.content` — es el nivel de
granularidad donde ocurre la recuperación híbrida (no sobre `Procedure`/`ResolvedCase` directo,
porque solo contenido chunkeado y aprobado se indexa para RAG, ver zeroq-rag §1).

```sql
ALTER TABLE "DocumentChunk"
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;

CREATE INDEX document_chunk_content_tsv_gin_idx
  ON "DocumentChunk" USING gin (content_tsv);
```

```sql
-- Segunda pierna de la búsqueda híbrida — se combina con el resultado del vector search
-- vía RRF (score = Σ 1/(k + rank_i), k≈60) en PgVectorStore, no en SQL.
SELECT id, ts_rank(content_tsv, plainto_tsquery('spanish', $1)) AS text_rank
FROM "DocumentChunk"
WHERE content_tsv @@ plainto_tsquery('spanish', $1)
ORDER BY text_rank DESC
LIMIT 20;
```

`'spanish'` como configuración de diccionario tsvector se asume porque el conocimiento interno de
ZeroQ es en español — **requiere validación** si hay contenido técnico mixto (comandos, logs en
inglés) donde `'simple'` podría rendir mejor para tokens exactos como códigos de error o nombres de
comando (el propio caso de uso que motiva la búsqueda híbrida en primer lugar, según zeroq-rag §4).

Tanto la columna generada como el índice GIN se declaran como `Unsupported` a nivel de
introspección de Prisma (Prisma no modela `GENERATED ALWAYS AS ... STORED`), por lo que viven
**solo** en el archivo de migración SQL, no en `schema.prisma` — mismo patrón que el índice HNSW.

---

## 4. Invariantes: DB vs aplicación

| Invariante (ARCHITECTURE.md §5.1) | Enforcement | Detalle |
|---|---|---|
| `Procedure` no puede aprobarse sin ≥1 `ReviewRequest` con `status=approved` por un Supervisor | **Aplicación** (Policy object `CanApproveProcedure`) | Requiere verificar el `role` del `User` referenciado por `reviewerId` en el momento de la aprobación — cruza dos tablas y una regla de negocio (rol específico), no expresable como CHECK de una sola fila. La DB solo garantiza que `ReviewRequest.reviewerId` referencia un `User` real (FK) y que `status` es uno de los 3 valores válidos (enum). |
| Solo la versión aprobada más reciente es la "vigente" | **Mixta** | La DB garantiza mecánicamente que `Procedure` tiene como máximo **un** puntero `currentVersionId` (es una columna, no una colección) — la elección de *cuál* versión es la vigente ("la más reciente aprobada") es lógica de aplicación ejecutada al aprobar una nueva versión. |
| `ResolvedCase` debe referenciar `Category`, opcionalmente `Client`/`InfrastructureAsset`; no puede crearse sin `solution` | **DB** | `categoryId NOT NULL` + FK; `solution String @db.Text` no-nulo. Enforcement completo a nivel de columna. |
| `InfrastructureAsset` siempre pertenece a un `Client` (no huérfanos) | **DB** | `clientId NOT NULL` + FK con `ON DELETE RESTRICT` (impide borrar un `Client` con assets activos sin decisión explícita — ver §7 sobre política de borrado). |
| `User` tiene exactamente un `Role` | **DB** | Columna `role` no-nula de tipo enum — no existe tabla de roles múltiples, así que "exactamente uno" es la forma natural de la columna. |
| `AIMessage` de tipo `assistant` debe registrar `sourceReferences` | **Mixta** | La DB puede forzar *no-nulidad condicional* vía `CHECK (role <> 'assistant' OR source_references IS NOT NULL)` (§6.2) — pero no puede verificar que las referencias sean *veraces* (que efectivamente correspondan a los chunks recuperados y citados en el texto). Esa trazabilidad real es responsabilidad de `AskAIUseCase` (mapear tags de cita `[PROC-142-v3]` → `sourceReferences` antes de persistir, ver skill `zeroq-rag` §6). |
| Un `Attachment` pertenece a exactamente un dueño (`Procedure` o `ResolvedCase`) | **DB** (tras la desviación de diseño de §2.2) | `CHECK (num_nonnulls(procedure_id, case_id) = 1)` (§6.2) reemplaza el patrón `ownerType/ownerId` del borrador — ver justificación y aviso de validación en §7. |
| `Document.supersedes` — la re-subida reemplaza, no versiona | **DB parcial + aplicación** | `supersedesId @unique` impide que dos documentos distintos apunten al mismo predecesor (integridad estructural). Que el `Document` reemplazado deje de aparecer en listados activos ("reemplazo" visible) es lógica de consulta de aplicación (filtrar `WHERE supersededBy IS NULL` o similar), no una constraint. |
| Solo contenido `approved` se indexa para RAG (`DocumentChunk`) | **Aplicación** | No hay FK de `DocumentChunk` hacia `Procedure`/`ProcedureVersion` (sourceId es polimórfico, ver §7) — nada en el esquema impide insertar un chunk de un procedimiento en borrador. El invariante vive enteramente en el pipeline de indexación (`IndexContentUseCase`, disparado solo por el evento `ProcedureApproved`), tal como lo especifica ARCHITECTURE.md §9 y la skill `zeroq-rag` §1. |
| `Favorite`/`ViewHistory` son transversales por usuario (D6) | **DB** | `Favorite` con PK compuesta `(userId, procedureId)` impide duplicados de forma nativa; `ViewHistory` no necesita unicidad (es un log append-only). |

**Regla general que emerge de la tabla:** toda invariante que se puede expresar como "esta columna
no puede ser nula / debe ser una de estas opciones / debe referenciar una fila existente / debe ser
única en combinación con otra" se resuelve en la DB. Toda invariante que requiere **leer otras
filas** (¿hay una `ReviewRequest` aprobada?, ¿cuál es la versión más reciente?), **conocer el rol
de otra entidad** (¿el revisor es Supervisor?), o **verificar contenido/veracidad** (¿las citas de
la IA son reales?) queda en la capa de aplicación — coherente con el uso de Policy objects y
Result/Either descrito en ARCHITECTURE.md §8.

---

## 5. Estrategia de migraciones

### 5.1 Flujo de desarrollo (`prisma migrate dev`)

1. Editar los archivos `prisma/schema/*.prisma` (uno por bounded context, §2).
2. `prisma migrate dev --name <descripcion> --create-only` — genera el SQL sin aplicarlo, para
   poder editarlo a mano (obligatorio en este proyecto porque **todo** cambio que toque
   `DocumentChunk.embedding`, el CHECK de `Attachment`, el CHECK de `AIMessage` o la columna
   generada `content_tsv` necesita SQL manual que Prisma no puede generar solo — ver §5.2).
3. Editar el archivo `migration.sql` generado para agregar las piezas no soportadas.
4. `prisma migrate dev --name <descripcion>` (sin `--create-only`) para aplicar y validar contra la
   shadow database.
5. `prisma generate` — regenerar el cliente (ya no ocurre automático como parte de `migrate dev` en
   la versión de Prisma usada, confirmado contra el CLI instalado — se documenta como paso explícito
   para no asumir el comportamiento de versiones anteriores).
6. `prisma db seed` — solo cuando se necesita repoblar datos (no se ejecuta automático).

### 5.2 SQL manual requerido en la migración inicial

La migración `0001_init` (o la primera que introduzca cada pieza) debe incluir, además de lo que
Prisma genera automáticamente:

```sql
-- 1. Extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Índice HNSW sobre embeddings (§3.2)
CREATE INDEX document_chunk_embedding_hnsw_idx
  ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. Columna generada + índice GIN para full-text search (§3.3)
ALTER TABLE "DocumentChunk"
  ADD COLUMN content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;
CREATE INDEX document_chunk_content_tsv_gin_idx ON "DocumentChunk" USING gin (content_tsv);

-- 4. CHECK: un Attachment pertenece a exactamente un dueño (§4)
ALTER TABLE "Attachment"
  ADD CONSTRAINT attachment_exactly_one_owner
  CHECK (num_nonnulls("procedureId", "caseId") = 1);

-- 5. CHECK: mensajes assistant siempre traen sourceReferences (§4)
ALTER TABLE "AIMessage"
  ADD CONSTRAINT ai_message_assistant_has_sources
  CHECK (role <> 'assistant' OR "sourceReferences" IS NOT NULL);
```

Este es el mecanismo estándar documentado por Prisma para features no expresables en el schema:
`--create-only` + edición manual + aplicar — no es un workaround improvisado, es el flujo oficial
para "unexecutable steps" y tipos custom (confirmado contra el código fuente/documentación actual
de `prisma migrate`, no de memoria de entrenamiento).

### 5.3 Producción / CI (`prisma migrate deploy`)

- `prisma migrate deploy` aplica las migraciones ya committeadas en `prisma/migrations/` — no
  genera, no prompea, no usa shadow database. Es lo único que corre en CI/CD y en el arranque del
  contenedor de producción (`CMD npx prisma migrate deploy && node dist/index.js`).
- `prisma migrate status` antes de cada deploy para verificar pendientes.
- Ninguna migración de este proyecto puede escribirse solo con `migrate dev` sin pasar por
  `--create-only` — todas tocan al menos una de las piezas de §5.2 en su primera aparición
  (`DocumentChunk`, `Attachment`, `AIMessage`).

### 5.4 Seed inicial

Script único `prisma/seed.ts`, idempotente (usa `upsert`, re-ejecutable sin duplicar):

**Catálogo de categorías técnicas** (del brief, 18 categorías planas, `parentId: null` — ver §7
sobre si se requiere jerarquía desde el día uno):

```
Linux, Windows, Docker, Docker Compose, PostgreSQL, Redis, RabbitMQ, Networking, SSH, Printer,
TV Box, PowerShell, Hardware, Audio, VPN, Servicios, Logs, Monitoreo
```

```typescript
const categories = [
  'Linux', 'Windows', 'Docker', 'Docker Compose', 'PostgreSQL', 'Redis', 'RabbitMQ',
  'Networking', 'SSH', 'Printer', 'TV Box', 'PowerShell', 'Hardware', 'Audio', 'VPN',
  'Servicios', 'Logs', 'Monitoreo',
]

for (const name of categories) {
  await prisma.category.upsert({
    where: { slug: slugify(name) },
    update: {},
    create: { name, slug: slugify(name) },
  })
}
```

**Usuario Admin inicial:**

```typescript
await prisma.user.upsert({
  where: { email: 'admin@zeroq.local' }, // placeholder — requiere validación (§7)
  update: {},
  create: {
    name: 'Administrador ZeroQ',
    email: 'admin@zeroq.local',
    passwordHash: await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD!, 12),
    role: 'admin',
    mustChangePassword: true,
  },
})
```

`ADMIN_INITIAL_PASSWORD` se lee de variable de entorno (nunca hardcodeada), y `mustChangePassword`
fuerza rotación en el primer login — este campo es un agregado de este documento sobre el borrador
de ARCHITECTURE.md §5.2, marcado en §7.

---

## 6. Supuestos y trade-offs — REQUIEREN VALIDACIÓN

Nada de lo siguiente se improvisa silenciosamente; se lista explícitamente para que el Arquitecto
Principal / Product lo confirme o corrija antes de generar el `schema.prisma` real:

1. **Estrategia de PK (`cuid()` vs `uuid()` vs `autoincrement()`)** — se eligió `cuid()` por DX y
   orden temporal implícito, pero es una decisión de este documento, no de ARCHITECTURE.md.
2. **`Attachment` con dos FKs nullable + CHECK en vez del patrón `ownerType`/`ownerId` polimórfico
   del borrador §5.2** — cambia la forma del dato (columnas `procedureId`/`caseId` en vez de
   `ownerType`/`ownerId`); se recomienda por integridad referencial real, pero es una desviación
   del borrador aprobado que debe confirmarse explícitamente.
3. **`ViewHistory` y `DocumentChunk.sourceId`/`AuditLog.entityId` quedan polimórficos sin FK real**
   — aceptado como trade-off porque son logs de solo-lectura/append donde el costo de una FK real
   (tabla puente o columnas separadas por tipo de entidad) no se justifica frente al riesgo bajo
   de una referencia rota. Confirmar que este nivel de integridad es aceptable para auditoría en
   sector bancario/hospitalario.
4. **`InfrastructureAsset.metadata` (jsonb) sin estructura tipada por tipo de activo** — un tótem,
   un servidor y una impresora térmica probablemente necesitan campos muy distintos dentro de
   `metadata`. No se modela como tabla por tipo (herencia) ni como JSON Schema validado a nivel DB
   — la validación por tipo, si se quiere, queda en un schema Zod discriminado en la capa de
   aplicación. Confirmar si esto es aceptable o si se requiere una validación más fuerte.
5. **Longitudes máximas de campo** (`title`, `name`, `email`, etc.) sin `@db.VarChar(n)` — se
   dejaron como `text` sin límite. Confirmar si Product/Seguridad requiere límites duros a nivel DB
   más allá de la validación Zod en el borde.
6. **Configuración de idioma para `tsvector`** (`'spanish'` elegido, ver §3.3) — confirmar si el
   contenido técnico (comandos, logs, nombres de producto en inglés) rinde mejor con `'simple'` o
   con una combinación de ambas columnas generadas.
7. **`vector(1024)` vs `halfvec(1024)`** — este documento sigue la instrucción explícita de D2/Fase
   1 (`vector(1024)`), pero la skill `pgvector-semantic-search` recomienda `halfvec` como default
   (50% menos storage/índice). Anotado como optimización futura de bajo riesgo, no bloqueante.
   **También D2 en sí** sigue marcado por ARCHITECTURE.md §11 como la decisión que más requiere
   confirmación explícita antes de implementar `search-ai` — un cambio de proveedor de embeddings
   después de tener datos reales implica re-embeber todo el corpus.
8. **Política de borrado de `Client`/`Category`/`Tag` con dependientes** (`ON DELETE RESTRICT`
   asumido implícitamente en el diseño de FKs no-nulas) — no está definido si el negocio necesita
   soft-delete/archivado en vez de bloqueo duro al intentar borrar una entidad con referencias
   activas.
9. **Campos agregados por este documento sin respaldo textual en ARCHITECTURE.md §5.2:**
   `updatedAt` en varias entidades, `User.mustChangePassword`, `Client.contactInfo` tipado como
   `Json` (el borrador no especifica tipo). Se agregaron por ser prácticas razonables de DB, no
   porque estén explícitamente pedidas — confirmar o remover.
10. **Email del Admin inicial (`admin@zeroq.local`)** — placeholder de seed, no un dato real;
    confirmar el email real antes de correr el seed en cualquier ambiente compartido.
11. **Jerarquía de categorías desde el día uno** — el seed inicial crea las 18 categorías como
    planas (`parentId: null`); confirmar si alguna debe anidarse desde el arranque (ej. "Docker
    Compose" como hija de "Docker") o si la jerarquía se define después, manualmente, vía UI admin.
12. **Unicidad de `InfrastructureAsset.serialNumber`** — no está claro si debe ser único
    globalmente, único por cliente, o no-único (algunos fabricantes reutilizan números de serie
    entre lotes) — se dejó sin constraint de unicidad por precaución, confirmar el comportamiento
    real de los datos antes de agregar un `@unique`.
13. **Opción B de pgvector (tipo nativo mapeado vía extensión experimental, §1)** — no adoptada
    ahora por ser experimental en Prisma 7.6.0; revisar cuando estabilice si simplifica el manejo
    de índices vectoriales dentro del propio `schema.prisma`.
