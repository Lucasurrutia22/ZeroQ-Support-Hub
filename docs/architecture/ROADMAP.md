# ZeroQ Support Hub — Roadmap de Implementación

**Estado:** Propuesta Fase 1, para aprobación junto al resto del paquete de diseño.

Orden de fases determinado por dependencias reales del dominio, no por facilidad: `Identity` y
`Knowledge` son prerequisito de todo lo demás (todo referencia `User`; `Search & AI` no tiene nada
que indexar hasta que exista contenido aprobado). Cada fase termina en un estado desplegable, no en
código a medio escribir.

---

## Fase 1 — Diseño completo (actual)

**Entregable:** este paquete — `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `UI_UX_DESIGN.md`,
`USE_CASES.md`, `ROADMAP.md` — aprobado explícitamente por el usuario antes de abrir un editor de
código. Sin esto, no se avanza a Fase 2.

**Gate de salida:** aprobación del usuario + resolución de las preguntas abiertas marcadas en
`USE_CASES.md` (acceso RO a IA/favoritos) y en `UI_UX_DESIGN.md` (patrón de chat, modal vs página).

---

## Fase 2 — Fundaciones técnicas

Sin features de negocio visibles todavía — el objetivo es que "crear un módulo nuevo" sea después
un ejercicio mecánico, no una decisión de infraestructura cada vez.

- Scaffolding Next.js (App Router) + TypeScript estricto + ESLint/Prettier.
- `docker-compose.yml` de desarrollo: PostgreSQL (con extensión `pgvector`), Redis, MinIO.
- Prisma: schema real derivado de `DATABASE_DESIGN.md`, migración inicial, seed (categorías
  técnicas + usuario Admin).
- Auth.js configurado sobre el contexto `identity`: login, sesiones en DB, roles enum.
- Shared kernel: `Entity`, `AggregateRoot`, `ValueObject`, `Result`, `DomainError`, `DomainEvent`,
  `EventBus` (in-process), `BaseRepository`.
- `AuditedUseCase` decorator (wiring, aunque los primeros use cases de negocio lleguen en Fase 3).
- CI mínimo: typecheck + lint + build en cada push.

**Gate de salida:** login funcional con los 5 roles seedeados, `docker-compose up` levanta todo el
stack, un "use case de humo" (ej. listar categorías) funciona end-to-end demostrando que las 4
capas (domain/application/infrastructure/presentation) están correctamente cableadas.

---

## Fase 3 — Knowledge (núcleo del producto)

El bounded context más grande y el que valida si Clean Architecture + DDD está bien aplicado antes
de replicar el patrón en el resto.

- Agregado `Procedure` completo: ciclo de vida `draft → in_review → approved/rejected → deprecated`
  (UC-KN-01 a 06), versionado, comentarios, tags, adjuntos.
- Entidad `Document` (D5): subida y reemplazo (UC-DOC-01/02).
- Categorías técnicas (jerarquía).
- Policies de los 5 roles aplicadas a cada use case (no después, como parche).
- UI: navegación base (app shell de `UI_UX_DESIGN.md`), pantallas de listado/detalle/crear-editar/
  cola de revisión.

**Gate de salida:** un Ingeniero N2 puede crear un procedimiento, un Supervisor puede aprobarlo, y
queda visible para todos los roles según la matriz de permisos — sin IA todavía, contenido 100%
manual.

---

## Fase 4 — Cases & Clients — **eliminada (2026-07-29)**

Se implementó completa (`Client`, `InfrastructureAsset`, `ResolvedCase`, `CaseProcedure`,
`Attachment`, UI y use cases) y luego se eliminó por completo: sin uso real, pedido explícito del
usuario ("elimina los módulos que no se utilicen"). Verificado antes de borrar: las 5 tablas
estaban vacías (0 filas reales). Detalle del borrado (código + schema + SQL manual) en
`AI_RAG_DESIGN.md` §13 y en la memoria del proyecto. El commit de git previo a la eliminación queda
como respaldo si se necesita reintroducir el módulo.

~~- `Client`, `InfrastructureAsset` (UC-CL-01 a 04).~~
~~- `ResolvedCase`, vínculo con `Procedure` (UC-CS-01 a 04).~~
~~- UI correspondiente.~~

---

## Fase 5 — Search & AI (RAG) — implementada

**Estado real:** implementada en código (`src/modules/search-ai/`, Route Handlers
`/api/ai/**` y `/api/search`, UI en `(dashboard)/{ai,search}`) — no solo diseñada. Ver
[`AI_RAG_DESIGN.md`](AI_RAG_DESIGN.md) §13 para las desviaciones reales entre el diseño y el
código (sin BullMQ/cola real, `Document` no se indexa todavía, sin streaming token a token, y el
LLM ahora es swappable entre Claude/OpenAI/Ollama/Azure OpenAI por `.env`, requisito agregado
al pedir la implementación que no estaba en el diseño original). `npx tsc --noEmit`, `npm run lint`
y `npm run build` verificados en 0 errores — falta el mismo bloqueo recurrente de siempre
(credenciales reales de Supabase + del proveedor de embeddings/LLM activo) para probar contra datos
reales.

- `EmbeddingProvider` (Voyage AI, D2) + `LLMProvider` (Anthropic Claude) + `VectorStore` (pgvector,
  D1) como adapters detrás de los ports ya definidos.
- Pipeline de indexación async (BullMQ, D7): `ProcedureApproved` / `ResolvedCaseCreated` /
  `DocumentUploaded` → chunking → embeddings → `document_chunks`.
- `AskAIUseCase` con streaming (Vercel AI SDK) y citas obligatorias (`sourceReferences`).
- Búsqueda híbrida (vector + full-text, RRF) — `SemanticSearchUseCase`.
- Analizadores de archivo (Strategy): log, docker-compose, .env, imagen (UC-AI-03).
- UI: buscador + chat conversacional según el patrón definido en `UI_UX_DESIGN.md`.

**Gate de salida:** el flujo principal completo del brief funciona de punta a punta — "el tótem no
imprime" → la IA responde citando procedimientos reales indexados en Fase 3 (Fase 4/Cases se
eliminó, ver arriba — la IA solo cita `Procedure` desde 2026-07-29).

---

## Fase 6 — Engagement & Analytics

- Favoritos, historial de vistas (UC-EN-01/02).
- Dashboard por rol (UC-AN-01), panel de auditoría (UC-AN-02), estadísticas de calidad documental
  (UC-AN-03) — el `AuditLog` ya se viene poblando desde Fase 2 (decorator), acá se construye la
  visualización.

**Gate de salida:** cada rol tiene un dashboard útil el primer día que abre sesión, no una pantalla
vacía.

---

## Fase 7 — Endurecimiento y despliegue

- Pase completo de `zeroq-security` (checklist OWASP/JWT/RBAC/CSRF/headers/rate-limit) sobre todo
  lo construido — no parcial, todo el sistema.
- Performance: revisión de índices reales bajo datos de prueba realistas (`postgresql-optimization`,
  `pgvector-semantic-search`), cache Redis en búsquedas frecuentes.
- Tests: unit en `domain`/`application` (sin infraestructura), integración en
  `infrastructure`/Route Handlers.
- Documentación final (`zeroq-docs`): README, spec OpenAPI generada desde los schemas Zod, ADRs de
  las decisiones D1-D7 formalizadas, manual técnico por bounded context, manual de usuario por rol,
  changelog.
- Despliegue productivo self-hosted: `docker-compose.prod.yml` (Next.js, Postgres+pgvector, Redis,
  MinIO, worker BullMQ) sobre la infraestructura Linux/Docker que ZeroQ ya opera.

**Gate de salida:** listo para que el equipo de soporte real lo use en producción interna.

---

## Fuera de alcance (explícitamente, para no generar deuda técnica por scope creep)

- RBAC dinámico/granular por categoría (D4) — solo si Fase 3-7 demuestran que el modelo de roles
  fijos se queda corto en uso real.
- Multi-tenant (vender el Hub a otra empresa) — el diseño no lo bloquea (ARCHITECTURE.md §12) pero
  no se construye preventivamente.
- Integraciones n8n — las skills de n8n están instaladas por si en el futuro se automatiza algo
  operativo (ej. notificaciones a Slack cuando se aprueba un procedimiento), pero no hay un caso de
  uso de negocio que lo requiera en este roadmap; se evalúa si surge la necesidad real.
