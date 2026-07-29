# ZeroQ Support Hub — Catálogo de Casos de Uso

**Estado:** Propuesta Fase 1, para aprobación junto al resto del paquete de diseño.
**Fuente:** deriva de `docs/architecture/ARCHITECTURE.md` (entidades, agregados, decisiones D1-D7).

Convención de ID: `UC-<CONTEXTO>-NN`. Roles abreviados: **AD**=Admin, **SU**=Supervisor Técnico,
**N1**=Ingeniero Soporte N1, **N2**=Ingeniero Soporte N2, **RO**=Solo Lectura. Cada caso de uso
corresponde 1:1 a una clase `application/use-cases/*UseCase.ts` en la fase de implementación (no se
crea antes de este documento estar aprobado).

---

## Identity

| ID | Nombre | Actor | Política | Evento emitido |
|---|---|---|---|---|
| UC-ID-01 | Iniciar sesión | Todos (no autenticado) | — (público) | — |
| UC-ID-02 | Cerrar sesión | Todos (autenticado) | — | — |
| UC-ID-03 | Crear usuario | AD | `CanManageUsers` | `UserCreated` |
| UC-ID-04 | Cambiar rol de usuario | AD | `CanManageUsers` | `UserRoleChanged` |
| UC-ID-05 | Desactivar/reactivar usuario | AD | `CanManageUsers` | `UserDeactivated` |

**Flujo UC-ID-03** (representativo): Admin abre Administración → Usuarios → completa
nombre/email/rol inicial → sistema crea `User` con `active=true` → invitación por email (fuera de
alcance MVP: puede ser un link de set-password manual entregado por el Admin) → evento
`UserCreated` disponible para `AuditLog`.

---

## Knowledge — Procedimientos (`Procedure`)

| ID | Nombre | Actor | Política | Evento |
|---|---|---|---|---|
| UC-KN-01 | Crear procedimiento (borrador) | N2 | `CanCreateProcedure` | `ProcedureCreated` |
| UC-KN-02 | Editar procedimiento (nueva versión) | N2 (autor u otro N2) | `CanEditProcedure` | `ProcedureVersionCreated` |
| UC-KN-03 | Solicitar revisión | N2 | `CanRequestReview` | `ReviewRequested` |
| UC-KN-04 | Aprobar procedimiento | SU | `CanApproveProcedure` | `ProcedureApproved` |
| UC-KN-05 | Rechazar procedimiento | SU | `CanApproveProcedure` | `ProcedureRejected` |
| UC-KN-06 | Deprecar procedimiento | SU, AD | `CanDeprecateProcedure` | `ProcedureDeprecated` |
| UC-KN-07 | Comentar procedimiento | N1, N2, SU | `CanComment` | `CommentAdded` |
| UC-KN-08 | Resolver comentario | Autor del comentario, SU | `CanResolveComment` | `CommentResolved` |
| UC-KN-09 | Etiquetar procedimiento | N2 | `CanEditProcedure` | — |
| UC-KN-10 | Adjuntar archivo (imagen/video/pdf/config/log) | N2 | `CanEditProcedure` | `AttachmentAdded` |
| UC-KN-11 | Consultar procedimiento (versión vigente) | Todos incl. RO | — (lectura pública interna) | `ProcedureViewed` → `ViewHistory` |
| UC-KN-12 | Listar/filtrar por categoría, estado, riesgo | Todos incl. RO | — | — |
| UC-KN-13 | Ver historial de versiones | Todos incl. RO | — | — |

**Invariante clave (UC-KN-04):** no se puede ejecutar `ApproveProcedureUseCase` si no existe una
`ReviewRequest` en estado `pending` para ese procedimiento — el use case debe fallar con
`DomainError('NoPendingReview')` vía `Result`, no lanzar excepción (ver ARCHITECTURE.md §8).

**Flujo UC-KN-01→04** (ciclo de vida completo, referencia para QA de Fase 3):
`draft` -[UC-KN-02]→ `draft` (n veces) -[UC-KN-03]→ `in_review` -[UC-KN-04]→ `approved`
(dispara indexación RAG async) o -[UC-KN-05]→ `draft` (con `notes` de rechazo) -[UC-KN-06 desde
`approved`]→ `deprecated` (se retira de resultados de búsqueda pero no se borra, por auditoría).

---

## Knowledge — Documentación (`Document`, D5)

| ID | Nombre | Actor | Política | Evento |
|---|---|---|---|---|
| UC-DOC-01 | Subir documento/manual de referencia | N2 | `CanUploadDocument` | `DocumentUploaded` |
| UC-DOC-02 | Reemplazar documento (supersede) | N2 | `CanUploadDocument` | `DocumentSuperseded` |
| UC-DOC-03 | Consultar documento | Todos incl. RO | — | `DocumentViewed` → `ViewHistory` |

Sin flujo de revisión/aprobación (a diferencia de `Procedure`) — el `Document` se indexa para RAG
inmediatamente al subirse (`DocumentUploaded` dispara indexación igual que `ProcedureApproved`, ver
ARCHITECTURE.md §5.3), pero el `AskAIUseCase` debe distinguir en la cita que es una fuente externa
no revisada por ZeroQ, no contenido propio aprobado.

---

## Knowledge — Categorías Técnicas

| ID | Nombre | Actor | Política |
|---|---|---|---|
| UC-CAT-01 | Crear categoría (con jerarquía padre/hijo) | AD | `CanManageCategories` |
| UC-CAT-02 | Editar/reordenar categoría | AD | `CanManageCategories` |
| UC-CAT-03 | Listar categorías (árbol) | Todos incl. RO | — |

---

## Cases — Casos Resueltos

| ID | Nombre | Actor | Política | Evento |
|---|---|---|---|---|
| UC-CS-01 | Crear caso resuelto | N1, N2 | `CanCreateCase` | `ResolvedCaseCreated` |
| UC-CS-02 | Vincular caso a procedimiento(s) relacionados | N1, N2 (autor) | `CanEditCase` | — |
| UC-CS-03 | Consultar caso | Todos incl. RO | — | `CaseViewed` → `ViewHistory` |
| UC-CS-04 | Buscar casos similares (categoría/cliente/asset) | Todos incl. RO | — | — |

`ResolvedCaseCreated` dispara indexación RAG inmediata (sin flujo de aprobación — ver
ARCHITECTURE.md §5.1, invariante: no puede crearse vacío de `solution`).

---

## Clients — Clientes e Infraestructura

| ID | Nombre | Actor | Política | Evento |
|---|---|---|---|---|
| UC-CL-01 | Crear cliente | AD | `CanManageClients` | `ClientCreated` |
| UC-CL-02 | Editar cliente | AD | `CanManageClients` | — |
| UC-CL-03 | Registrar activo de infraestructura | AD, N2 | `CanManageInfrastructure` | `AssetRegistered` |
| UC-CL-04 | Consultar infraestructura de un cliente | Todos incl. RO | — | — |

---

## Search & AI

| ID | Nombre | Actor | Política | Evento |
|---|---|---|---|---|
| UC-AI-01 | Buscar (palabra clave + semántica, hybrid) | Todos incl. **RO** | — | `SearchPerformed` |
| UC-AI-02 | Preguntar a la IA (chat RAG conversacional) | N1, N2, SU, AD — **RO excluido** (ver nota) | `CanUseAI` | `AIQuestionAsked` |
| UC-AI-03 | Analizar archivo adjunto (log/compose/.env/imagen) | N2 (SU/AD por herencia si aplica) | `CanAnalyzeFiles` | `AttachmentAnalyzed` |
| UC-AI-04 | Indexar contenido aprobado (sistema, event-driven) | Sistema (BullMQ worker) | — | `ContentIndexed` |

**Nota sobre UC-AI-02:** el brief lista "Utiliza la IA" como acción explícita de N1/N2, pero
**Solo Lectura** únicamente tiene "consultar documentación y utilizar el buscador" — el chat
conversacional queda excluido para RO en esta propuesta. **Confirmar con el usuario en la revisión
de Fase 1** — si RO también debe tener acceso al chat, es un cambio de una línea en la Policy, no
de arquitectura.

---

## Engagement

| ID | Nombre | Actor | Política |
|---|---|---|---|
| UC-EN-01 | Marcar/desmarcar favorito | N1, N2, SU, AD (RO: a confirmar, mismo criterio que UC-AI-02) | `CanFavorite` |
| UC-EN-02 | Ver historial propio de vistas | Todos incl. RO | — |

---

## Analytics

| ID | Nombre | Actor | Política |
|---|---|---|---|
| UC-AN-01 | Ver dashboard (KPIs propios) | Todos (datos filtrados por rol — ver nota) | — |
| UC-AN-02 | Ver auditoría completa | SU, AD | `CanViewAudit` |
| UC-AN-03 | Ver estadísticas de calidad documental | SU, AD | `CanViewStats` |

**Nota UC-AN-01:** el dashboard no es una pantalla única para todos — Admin ve KPIs globales
(usuarios activos, procedimientos pendientes de revisión, calidad documental); Supervisor ve su
cola de revisión + indicadores de su equipo; N1/N2 ven su actividad personal (favoritos, casos
creados) + accesos rápidos. Esto se detalla en `UI_UX_DESIGN.md` (entregable en paralelo).

---

## Administration

| ID | Nombre | Actor | Política |
|---|---|---|---|
| UC-AD-01 | Configurar parámetros del sistema (proveedor IA activo, límites de rate limit) | AD | `CanManageConfig` |

No incluye gestión de permisos granulares por categoría — descartado explícitamente en D4 (roles
fijos por enum en Fase 1); si se requiere en el futuro, es una migración de `Policy` documentada en
`zeroq-security`, no un caso de uso de Fase 1.

---

## Resumen de cobertura

42 casos de uso identificados contra ~35 acciones listadas en el brief original — la diferencia son
acciones de sistema (indexación) y desdoblamientos necesarios para modelar el ciclo de vida de
`Procedure` (crear/editar/solicitar/aprobar/rechazar/deprecar son 6 casos de uso, no 1, porque cada
uno tiene una política y una precondición distintas). Dos preguntas quedan explícitamente abiertas
para la aprobación de Fase 1: acceso de **Solo Lectura** al chat de IA (UC-AI-02) y a favoritos
(UC-EN-01).
