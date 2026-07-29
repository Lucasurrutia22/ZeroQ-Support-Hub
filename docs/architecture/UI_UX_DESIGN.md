# ZeroQ Support Hub — Diseño de UI/UX

**Estado:** Propuesta para validación — Fase 1 (Diseño). Ningún componente React/`.tsx` ha sido
escrito todavía; este documento es el diseño de información/navegación/pantallas que precede a la
implementación.
**Autor:** Frontend/UX Engineer (Claude)
**Fecha:** 2026-07-23
**Depende de:** [`docs/architecture/ARCHITECTURE.md`](./ARCHITECTURE.md) — §4 (mapeo de módulos),
§6 (estructura de carpetas), §7 (Server Components vs Route Handlers), §9 (flujo RAG), §11 D5/D6.

> Nota de alcance: la skill de convenciones de componentes React
> (`.claude/skills/react-frontend/SKILL.md`) mencionada en el encargo no existe todavía en este
> repo — el único inventario de skills presente es `zeroq-openai`, `zeroq-rag`, `zeroq-security`,
> `zeroq-docs`. Este documento se alinea en su lugar directamente con ARCHITECTURE.md §6/§7 (App
> Router, route groups, Server Components por defecto, Client Components solo donde hay
> interactividad o streaming). Si más adelante se crea esa skill, revisar este documento contra
> ella antes de pasar a implementación.

---

## 0. Nota sobre cobertura de carpetas

ARCHITECTURE.md §6 lista `app/(dashboard)/{procedures,cases,clients,search,ai,admin}` como
esqueleto ilustrativo, no exhaustivo — no incluye una carpeta explícita para `Document` (D5, entidad
separada de `Procedure`), ni para `Favorite`/`ViewHistory` (Engagement, D6), ni una carpeta propia
para Auditoría. Este documento **propone** dónde viven esas pantallas dentro del mismo route group
`(dashboard)`, marcado explícitamente como **[PROPUESTA — extiende §6]** cada vez que aparece, para
que se confirme junto con el resto antes de tocar código.

---

## 1. Layout del app shell

### 1.1 Zonas del armazón

| Zona | Contenido | Notas |
|---|---|---|
| **Topbar** (fija, altura fija) | Logo/nombre "ZeroQ Support Hub" · buscador rápido global (estilo `⌘K` / command palette, atajo a `/search`) · selector de estado/salud del sistema (opcional) · menú de usuario (avatar → rol visible, Favoritos, Historial, Cerrar sesión) · notificaciones (ej. "tu procedimiento fue aprobado/rechazado") | Persistente en todas las rutas de `(dashboard)`. El buscador rápido de la topbar es un atajo, no reemplaza la pantalla `/search` completa. |
| **Sidebar** (nav primaria, colapsable a rail de iconos) | Árbol de navegación de la sección 2, agrupado por bounded context con separadores visuales sutiles (no literales "Knowledge/Cases/Clients" — esas son etiquetas internas de arquitectura, no vocabulario de usuario) | Ítems visibles varían por rol (sección 3). Estado activo resaltado. Colapsable manualmente y por breakpoint. |
| **Área de contenido** | Renderizado de la ruta activa — normalmente un Server Component de layout con: header de página (título + acciones primarias a la derecha, ej. "Nuevo procedimiento") + cuerpo (tabla/listado, formulario, detalle, chat) | Puede tener un panel lateral secundario contextual (ej. panel de citas de la IA, panel de filtros) — ver sección 6. |

### 1.2 Diagrama ASCII

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR:  ZeroQ Support Hub    [ 🔍 Buscar… ⌘K ]      🔔   👤 Rol ▾        │
├───────────────┬────────────────────────────────────────────────────────┤
│  SIDEBAR      │  Header de página: Título · [Acción primaria]           │
│  (colapsable) │  ────────────────────────────────────────────────────  │
│               │                                                          │
│  Dashboard    │                                                          │
│  ──────────   │              ÁREA DE CONTENIDO                          │
│  Procedimien. │   (listado / detalle / formulario / chat IA / etc.,     │
│  Documentac.  │    según la ruta activa — Server Component + islas       │
│  ──────────   │    de Client Components donde hay interactividad)       │
│  Casos        │                                                          │
│  ──────────   │        [ + panel lateral contextual opcional,           │
│  Clientes     │          ej. filtros, citas de IA, metadata ]           │
│  ──────────   │                                                          │
│  Buscador     │                                                          │
│  Asistente IA │                                                          │
│  ──────────   │                                                          │
│  Favoritos    │                                                          │
│  Historial    │                                                          │
│  ──────────   │                                                          │
│  Administrac. │                                                          │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 1.3 Comportamiento responsive (alto nivel)

Es una herramienta interna de operación (no consumer-facing), por lo que **desktop es el caso
primario de diseño**, pero N2 puede necesitar consultarla desde tablet estando físicamente junto a
un tótem/infraestructura de cliente — se diseña con 3 quiebres:

- **Desktop (≥1280px):** sidebar expandida con etiquetas, panel lateral contextual visible en
  paralelo al contenido principal (dos columnas).
- **Tablet (768–1279px):** sidebar colapsa a rail de solo-iconos (expandible on-hover/tap); el
  panel lateral contextual (ej. citas de IA) pasa a un drawer superpuesto en vez de columna fija.
- **Mobile (<768px):** sidebar se oculta detrás de un botón hamburguesa en la topbar; navegación
  primaria pasa a un menú de pantalla completa; todo el contenido es de una sola columna; el chat
  IA y el buscador priorizan legibilidad de respuesta sobre densidad de metadata.

El grado real de inversión en el caso mobile queda como pregunta abierta (sección 7) — depende de
si soporte usa la Hub predominantemente desde escritorio en oficina o también en terreno.

---

## 2. Árbol de navegación completo (sitemap)

Mapeado 1:1 contra `app/(dashboard)/...` de ARCHITECTURE.md §6, con las extensiones propuestas
marcadas. Cada nodo indica el Bounded Context dueño (ARCHITECTURE.md §4).

```
(dashboard)
├── /dashboard                          [Analytics]           — Home / KPIs / accesos directos
│
├── /procedures                         [Knowledge — Procedure]
│   ├── /procedures                     — listado (con árbol/filtro de categorías, ver §7)
│   ├── /procedures/new                 — crear procedimiento
│   ├── /procedures/[id]                — detalle (versión vigente + comentarios, D6)
│   ├── /procedures/[id]/edit           — editar (crea nueva ProcedureVersion)
│   ├── /procedures/[id]/versions       — historial de versiones
│   ├── /procedures/review              — cola de revisión (Supervisor/Admin)
│   └── /procedures/categories          — gestión de Categorías Técnicas (Admin)
│
├── /documents                          [Knowledge — Document, D5]  [PROPUESTA — extiende §6]
│   ├── /documents                      — listado de manuales/datasheets de terceros
│   ├── /documents/upload               — subir manual (reemplaza vía `supersedes`, no versiona)
│   └── /documents/[id]                 — detalle / visor de archivo
│
├── /cases                              [Cases]
│   ├── /cases                          — listado de Casos Resueltos
│   ├── /cases/new                      — documentar caso nuevo
│   └── /cases/[id]                     — detalle (síntomas, causa raíz, solución, procedimientos relacionados)
│
├── /clients                            [Clients — Client + InfrastructureAsset]
│   ├── /clients                        — listado de clientes (banco/hospital/municipalidad/retail/gobierno)
│   ├── /clients/[id]                   — detalle de cliente
│   ├── /clients/[id]/assets            — infraestructura del cliente (tótems, módulos, servidores…)
│   └── /clients/[id]/assets/[assetId]  — detalle de un activo + casos asociados
│
├── /search                             [Search & AI — buscador tradicional]
│   └── /search                         — búsqueda semántica/por filtros sobre Procedure/Document/Case
│
├── /ai                                 [Search & AI — chat conversacional]
│   ├── /ai                             — nueva conversación
│   └── /ai/[conversationId]            — conversación existente (historial de mensajes)
│
├── /favorites                          [Engagement]  [PROPUESTA — extiende §6]
│   └── /favorites                      — procedimientos guardados por el usuario actual
│
├── /history                            [Engagement]  [PROPUESTA — extiende §6]
│   └── /history                        — historial de vistas del usuario actual
│
└── /admin                              [Identity + Analytics(audit) + config]
    ├── /admin/users                    — gestión de usuarios y roles
    ├── /admin/audit                    — bitácora de auditoría  [PROPUESTA — extiende §6, ver §7]
    └── /admin/settings                 — configuración general del sistema
```

**Nota:** `/procedures/categories` y `/admin` como ubicación de gestión de Categorías Técnicas
compiten como candidatas — se deja resuelto en la matriz de rol (sección 3) que la **gestión**
(crear/editar/eliminar categoría) es acción de Admin, pero la **navegación** por categorías (árbol
de filtro) es visible para todos los roles con acceso a `/procedures`. Dónde vive el CRUD exacto de
categorías es una de las preguntas abiertas de la sección 7.

---

## 3. Matriz de visibilidad por rol

Roles tal como están fijados en ARCHITECTURE.md §5.2 (enum `role`):
`admin | supervisor | engineer_l1 | engineer_l2 | readonly`.

### 3.1 Ítems de navegación (sidebar) visibles

| Ítem de nav | Admin | Supervisor Técnico | Ing. N1 | Ing. N2 | Solo Lectura |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ (global) | ✅ (equipo) | ✅ (personal) | ✅ (personal) | ✅ (básico) |
| Procedimientos | ✅ | ✅ | ✅ | ✅ | ✅ (solo lectura de contenido aprobado) |
| Procedimientos → cola de revisión | ✅ | ✅ | ❌ | ❌ | ❌ |
| Procedimientos → categorías (gestión) | ✅ | 👁️ solo ver | ❌ | ❌ | ❌ |
| Documentación (manuales) | ✅ | ✅ | ✅ (ver) | ✅ (ver + subir) | ✅ (ver) |
| Casos Resueltos | ✅ | ✅ | ✅ | ✅ | ✅ (ver) |
| Clientes / Infraestructura | ✅ | ✅ | ✅ (ver) | ✅ (ver) | ✅ (ver) |
| Buscador | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Asistente IA (chat)** | ✅ | ✅ | ✅ | ✅ | ⚠️ **ver nota** |
| Favoritos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Historial | ✅ | ✅ | ✅ | ✅ | ✅ |
| Administración (usuarios/roles) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auditoría | ✅ | ✅ (revisar actividad de técnicos) | ❌ | ❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ **Nota — decisión de producto pendiente de confirmar, no asumida por este diseño:** el brief
> original le da a **Solo Lectura** acceso explícito a "consultar documentación" y "utilizar el
> buscador", pero **no menciona el chat de IA conversacional** para este rol (sí lo menciona
> explícitamente para N1: "utiliza la IA"). Este documento **no decide** si Solo Lectura ve `/ai`:
> dos opciones razonables, a elegir por el usuario:
> - **Opción A (estricta al brief):** `/ai` no aparece en el nav de Solo Lectura; su único punto de
>   entrada a "preguntar algo" es `/search`.
> - **Opción B (extensión razonable):** Solo Lectura ve `/ai` en modo lectura (puede preguntar y
>   leer respuestas con sus citas, pero no puede guardar favoritos desde ahí, o alguna limitación
>   menor).
> Hasta que se confirme, la matriz de arriba marca la celda como abierta (⚠️) en vez de asumir un
> valor.

### 3.2 Acciones por módulo (lenguaje natural, quién las ve)

| Acción | Admin | Supervisor | N1 | N2 | Solo Lectura |
|---|:---:|:---:|:---:|:---:|:---:|
| Buscar / consultar contenido aprobado | ✅ | ✅ | ✅ | ✅ | ✅ |
| Usar el chat de IA | ✅ | ✅ | ✅ | ✅ | ⚠️ (ver nota 3.1) |
| Guardar favoritos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear caso resuelto | ✅ | ✅ | ✅ | ✅ | ❌ |
| Proponer mejora a un procedimiento (comentario/sugerencia) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Redactar/editar un procedimiento (nueva versión) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Subir un manual/documento de terceros | ✅ | ❌ | ❌ | ✅ | ❌ |
| Analizar logs / archivos adjuntos (IA) | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Solicitar revisión** de un procedimiento propio | ✅ | — | ✅ | ✅ | — |
| **Aprobar / rechazar** una revisión de procedimiento | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Aprobar** documentación (manual subido) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver indicadores de equipo (dashboard agregado) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver actividad de técnicos (auditoría acotada) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios y roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar categorías (crear/editar/eliminar) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configurar el sistema | ✅ | ❌ | ❌ | ❌ | ❌ |

La fila **"Aprobar/rechazar revisión"** y **"Aprobar documentación"** son las que separan
claramente Supervisor/Admin del resto — son las únicas acciones de aprobación en toda la matriz,
consistente con el invariante de ARCHITECTURE.md §5.1 ("no se puede aprobar sin una `ReviewRequest`
approved por un Supervisor Técnico").

---

## 4. Inventario de pantallas por módulo

Para cada Bounded Context: pantallas clave, qué muestran, acciones principales (lenguaje natural).

### 4.1 Knowledge — Procedimientos (`Procedure`)

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Listado | `/procedures` | Tabla/tarjetas de procedimientos con estado (`draft/in_review/approved/deprecated`), categoría, nivel de riesgo, autor, última actualización. Filtro por árbol de categorías, riesgo, estado. | Buscar dentro del listado, filtrar, abrir detalle, "Nuevo procedimiento" (según rol). |
| Detalle | `/procedures/[id]` | Contenido de la versión vigente (Markdown renderizado), metadata (riesgo, tiempo estimado, categoría, adjuntos), hilo de comentarios, casos resueltos relacionados. | Marcar favorito, comentar/proponer mejora, ver historial de versiones, editar (si autor/N2/Supervisor/Admin), solicitar revisión. |
| Crear/Editar | `/procedures/new`, `/procedures/[id]/edit` | Formulario de contenido (editor Markdown), categoría, nivel de riesgo, tiempo estimado, tags, adjuntos. | Guardar como borrador, solicitar revisión, cancelar. |
| Historial de versiones | `/procedures/[id]/versions` | Línea de tiempo de `ProcedureVersion` con resumen de cambios por versión y autor. | Ver diff/versión anterior, restaurar como base de una nueva edición. |
| Cola de revisión | `/procedures/review` | Lista de `ReviewRequest` con estado `pending`, procedimiento afectado, solicitante, fecha. Solo Supervisor/Admin. | Aprobar, rechazar (con nota), abrir el procedimiento en contexto. |
| Categorías (gestión) | `/procedures/categories` | Árbol jerárquico de categorías técnicas (padre/hijo). Solo Admin edita. | Crear categoría, renombrar, mover en el árbol, eliminar (si no tiene contenido asociado). |

### 4.2 Knowledge — Documentación (`Document`, D5) — [PROPUESTA]

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Listado | `/documents` | Manuales/datasheets/firmware notes de terceros, por categoría y cliente (si aplica), tipo de archivo, quién lo subió, si fue reemplazado (`supersedes`). | Filtrar, descargar/ver, abrir detalle. |
| Subir | `/documents/upload` | Formulario simple: archivo, título, categoría, cliente (opcional), tipo. Sin flujo de revisión (a diferencia de `Procedure`) — Admin sí debe aprobarlo antes de indexarse para IA, según el brief ("aprueba documentación"). | Subir, marcar como reemplazo de un documento existente. |
| Detalle | `/documents/[id]` | Visor de archivo embebido o descarga, metadata, versión anterior si fue reemplazado. | Descargar, reemplazar (subir nueva versión que marca `supersedes`), marcar favorito. |

### 4.3 Cases — Casos Resueltos

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Listado | `/cases` | Casos por cliente, categoría, activo de infraestructura, ingeniero, fecha de resolución. | Filtrar, buscar, abrir detalle, "Nuevo caso". |
| Crear | `/cases/new` | Formulario: cliente/activo (opcional), categoría, síntomas, causa raíz, solución, tiempo invertido, procedimientos relacionados, adjuntos. | Guardar (queda disponible de inmediato — sin flujo de aprobación, a diferencia de `Procedure`). |
| Detalle | `/cases/[id]` | Todo el contenido del caso + procedimientos vinculados + adjuntos. | Vincular procedimiento, marcar favorito, editar (autor/N2/Admin). |

### 4.4 Clients — Clientes e Infraestructura

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Listado de clientes | `/clients` | Clientes por tipo (banco/hospital/municipalidad/retail/gobierno), estado activo. | Filtrar por tipo, buscar, abrir detalle, crear cliente (Admin/Supervisor). |
| Detalle de cliente | `/clients/[id]` | Info de contacto, resumen de casos históricos, lista de activos. | Editar datos, ver casos del cliente. |
| Infraestructura del cliente | `/clients/[id]/assets` | Activos (tótems, módulos, servidores…) con tipo, modelo, ubicación, serial. | Agregar activo, abrir detalle de activo. |
| Detalle de activo | `/clients/[id]/assets/[assetId]` | Metadata del activo + casos donde estuvo involucrado. | Editar, ver casos relacionados. |

### 4.5 Search & AI — Buscador y Asistente

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Buscador | `/search` | Resultados híbridos (semántico + filtros) sobre `Procedure`/`Document`/`ResolvedCase` aprobados, con snippet resaltado y tipo de fuente. | Filtrar por tipo/categoría/cliente, abrir resultado, "Preguntarle a la IA sobre esto" (puente hacia `/ai`, ver sección 6). |
| Chat IA — nueva conversación | `/ai` | Estado vacío con sugerencias de preguntas frecuentes, input de chat. | Iniciar conversación, adjuntar archivo (log/compose/.env/imagen) para análisis. |
| Chat IA — conversación | `/ai/[conversationId]` | Historial de mensajes, respuestas con streaming, citas a fuentes, tarjeta estructurada (riesgo/tiempo/comandos), input para seguir preguntando. | Continuar la conversación, abrir una fuente citada, guardar/documentar como procedimiento o caso a partir de la respuesta (ver sección 6). |

### 4.6 Engagement — Favoritos e Historial — [PROPUESTA]

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Favoritos | `/favorites` | Procedimientos guardados por el usuario actual. | Quitar de favoritos, abrir procedimiento. |
| Historial | `/history` | Últimas entidades vistas (procedimientos, casos, documentos) con fecha/hora. | Reabrir, limpiar historial. |

### 4.7 Analytics — Dashboard y Auditoría

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Dashboard | `/dashboard` | KPIs según rol: Admin/Supervisor ven agregados de equipo (procedimientos pendientes de revisión, casos del mes, categorías con más consultas, uso de IA); N1/N2/Solo Lectura ven un resumen personal (mis favoritos recientes, mis casos, accesos directos). | Navegar a los módulos referenciados desde cada tarjeta. |
| Auditoría | `/admin/audit` | Bitácora de acciones (`AuditLog`): quién hizo qué, sobre qué entidad, cuándo. Filtrable por usuario, tipo de acción, rango de fecha. | Filtrar, exportar (si se decide), abrir la entidad afectada. |

### 4.8 Identity — Administración

| Pantalla | Ruta | Qué muestra | Acciones principales |
|---|---|---|---|
| Usuarios | `/admin/users` | Listado de usuarios con rol y estado activo/inactivo. | Crear usuario, cambiar rol, activar/desactivar. |
| Configuración | `/admin/settings` | Parámetros generales del sistema (no específicos de un módulo). | Editar y guardar configuración. |

---

## 5. Walkthrough del flujo principal

Sigue el flujo del brief: *"el tótem no imprime."* Pantalla a pantalla, para el rol Ingeniero N1
(caso base; N2 tiene los mismos pasos más las acciones de documentación avanzada).

1. **`/dashboard`** — El técnico entra al Hub al iniciar su turno. Ve accesos directos y, si tiene
   favoritos relevantes, los ve resaltados. Ningún paso obligatorio aquí — es el punto de entrada,
   no un requisito del flujo.
2. **`/search` o `/ai`** — El técnico elige cómo formular la consulta:
   - Si sabe qué término buscar ("tótem no imprime", "printer error totem-x200"), usa **`/search`**
     y filtra resultados por tipo/categoría.
   - Si prefiere describir el síntoma en lenguaje natural o necesita razonamiento ("¿por qué puede
     estar pasando esto y qué debo revisar primero?"), usa **`/ai`**.
   (Ver sección 6 sobre cómo conviven ambas entradas.)
3. **Respuesta de la IA (`/ai/[conversationId]`)** — La IA hace RAG sobre `Procedure`/`Document`/
   `ResolvedCase` aprobados y responde con streaming, mostrando:
   - Procedimiento(s) recomendado(s), con pasos y comandos.
   - Advertencias/precondiciones (ej. "cortar energía antes de abrir la impresora").
   - Casos similares ya resueltos (con resultado).
   - Nivel de riesgo y tiempo estimado (tarjeta estructurada, no solo prosa).
   - Archivos/adjuntos relacionados (fotos, configs).
   - Citas clicables a cada fuente (ver sección 6).
4. **El técnico abre una fuente citada** (ej. `/procedures/[id]`) para confirmar el detalle completo
   antes de actuar sobre infraestructura de un cliente sensible (banco/hospital).
5. **El técnico aplica la solución** en terreno/remotamente — esto ocurre fuera del Hub (no hay
   pantalla para "ejecutar" un comando; el Hub es la fuente de conocimiento, no un ejecutor).
6. **Si la solución ya existía como procedimiento:** el técnico vuelve a esa pantalla de detalle,
   opcionalmente dejando un comentario ("funcionó, pero además revisar el driver X") o marcándolo
   como favorito para la próxima vez.
7. **Si la solución era nueva** (no existía procedimiento ni caso previo): el técnico documenta —
   - **`/cases/new`** si es la resolución puntual de una incidencia concreta (síntomas, causa raíz,
     solución, tiempo invertido, vinculado al cliente/activo).
   - **`/procedures/new`** si la solución es generalizable y merece quedar como procedimiento
     reutilizable — en ese caso entra a estado `draft` y sigue el flujo de revisión.
8. **Cola de revisión (`/procedures/review`)** — si se creó/editó un procedimiento, un Supervisor
   Técnico lo revisa y aprueba o rechaza (con nota). Solo al aprobarse dispara el evento
   `ProcedureApproved`.
9. **Indexación asíncrona** (sin pantalla — trabajo de fondo vía BullMQ, ARCHITECTURE.md §9): el
   contenido aprobado se chunkea y embebe, quedando disponible para que la IA lo cite en futuras
   respuestas — cerrando el loop: la próxima vez que otro técnico pregunte algo similar, la IA
   podrá citar este procedimiento o caso nuevo.

---

## 6. Patrón de UI para el chat de IA

### 6.1 Streaming

- El mensaje del asistente se renderiza **progresivamente token a token** (Vercel AI SDK,
  ARCHITECTURE.md §10) dentro de una burbuja de chat que crece en tiempo real — no aparece de golpe
  al terminar.
- Mientras llega el stream, se muestra un indicador de estado breve antes del primer token
  ("Buscando en la base de conocimiento…") para cubrir la latencia del paso de retrieval (embed +
  similarity search) que ocurre *antes* de que el LLM empiece a responder.
- La **tarjeta estructurada** (riesgo / tiempo estimado / comandos / archivos relacionados) se
  renderiza **después** de que el streaming de texto termina, no en paralelo — evita que aparezca
  con datos parciales o se reordene mientras el usuario está leyendo.
- Las **citas** (ver 6.2) se van adjuntando conforme aparecen referenciadas en el texto (si el
  proveedor las expone incrementalmente) o se consolidan al final del mensaje — cualquiera de las
  dos es válida; se decide en implementación según lo que exponga el SDK, no es una decisión de UX.

### 6.2 Citas a fuentes (requisito de confianza explícito)

Cada `AIMessage` de tipo assistant trae `sourceReferences` (ARCHITECTURE.md §5.1/§9) — la UI nunca
debe mostrar una respuesta sin poder trazarla:

- Cada afirmación relevante lleva un **marcador de cita numerado** inline (`[1]`, `[2]`…), estilo
  nota al pie, no un párrafo genérico de "fuentes" al final sin relación con el texto.
- Al pasar el cursor sobre una cita (hover) o tocarla (mobile), se despliega una **vista previa**
  (tooltip/popover) con: título de la fuente, tipo (Procedimiento / Caso Resuelto / Documento), y
  un fragmento del contenido citado.
- Al hacer clic, la cita **navega** a la pantalla de detalle real de la fuente (`/procedures/[id]`,
  `/cases/[id]`, `/documents/[id]`) — nunca es un enlace decorativo. Se recomienda abrir en un panel
  lateral (drawer) en vez de abandonar la conversación, para no perder el hilo del chat; en mobile
  se puede navegar de página completa.
- **Distinción de confianza (D5):** una cita a `Procedure`/`ResolvedCase` (contenido propio,
  revisado/aprobado) se distingue visualmente (ej. badge "Verificado ZeroQ") de una cita a
  `Document` (manual externo de fabricante, sin flujo de revisión) — ej. badge "Manual del
  fabricante" — para que el técnico calibre cuánto confiar en cada fuente, tal como exige
  ARCHITECTURE.md §5.3.

### 6.3 Convivencia de Buscador tradicional y Chat conversacional

**Opción propuesta (a validar, no decidida de forma definitiva):** **dos entradas de navegación
separadas** (`/search` y `/ai`) en vez de una sola pantalla con modo toggle.

Justificación:
- Son dos modelos mentales distintos: `/search` es una consulta rápida tipo "encontrar el
  documento que ya sé que existe" (baja latencia, resultados escaneables, filtros); `/ai` es una
  interacción conversacional de varios turnos tipo "razonar sobre un problema que no sé cómo
  resolver todavía" (más lenta, produce una respuesta sintetizada con citas).
- Fusionarlas en una sola pantalla con toggle arriesga que el modo buscador se sienta "degradado"
  dentro de una interfaz pensada para chat (inputs de chat no son buenos inputs de búsqueda con
  filtros).
- Además resuelve de forma más simple la pregunta de visibilidad por rol (sección 3.1): si Solo
  Lectura finalmente no debe ver el chat, es una entrada de nav completa que se oculta, no un modo
  a esconder dentro de una pantalla compartida.

**Puente entre ambas** (mitiga el costo de tenerlas separadas): dentro de los resultados de
`/search`, un CTA secundario **"Preguntarle a la IA sobre esto"** abre `/ai` con el contexto de esa
búsqueda precargado como primer mensaje — así el usuario no pierde lo ya escrito si decide que
necesita razonamiento en vez de una lista de resultados.

Esta decisión (dos entradas vs. una con toggle) queda marcada como **abierta a validación** en la
sección 7 — es una decisión de producto/UX con argumentos válidos en ambos sentidos.

### 6.4 Documentar desde una respuesta de IA

Cuando una respuesta de la IA resuelve algo que no existía como procedimiento/caso previo, se ofrece
un atajo **"Documentar esto como procedimiento"** / **"Documentar esto como caso"** que **prellena**
el formulario de `/procedures/new` o `/cases/new` con el contenido de la respuesta como punto de
partida editable — reduce la fricción de cerrar el loop del flujo principal (paso 7 de la sección 5)
sin que el técnico tenga que re-escribir lo que la IA ya sintetizó.

---

## 7. Preguntas de UX abiertas (a confirmar por el usuario)

Estas decisiones se dejan explícitamente sin resolver porque son ambiguas en el brief o son
genuinamente de producto, no de arquitectura:

1. **Chat IA para Solo Lectura:** ¿el rol Solo Lectura ve `/ai`, o queda estrictamente limitado a
   `/search` tal como está redactado el brief? (sección 3.1, marcado con ⚠️).
2. **Buscador vs. Chat IA en la navegación:** ¿dos entradas de nav separadas (propuesta de la
   sección 6.3) o una sola pantalla con un toggle de modo "Buscar / Preguntar"?
3. **Crear/editar procedimiento:** ¿modal/panel lateral (edición rápida) o página completa dedicada
   (`/procedures/new`, como se asumió en este documento)? El contenido es Markdown potencialmente
   extenso con versionado — una página completa parece más natural, pero se deja abierto.
4. **Árbol de categorías técnicas:** ¿se navega como sidebar secundario (panel fijo dentro de
   `/procedures`, al estilo Confluence spaces) o como filtro desplegable/chips sobre el listado? El
   inventario de la sección 4.1 asumió un uso mixto (filtro para todos, gestión CRUD solo Admin) sin
   comprometerse al patrón visual exacto.
5. **Ubicación de la gestión de categorías:** ¿vive dentro de `/procedures/categories` (como se
   propuso) o dentro de `/admin` junto con usuarios y configuración, ya que ambas son tareas
   exclusivas de Admin?
6. **Favoritos e Historial en la navegación:** ¿son ítems de primer nivel en el sidebar (como se
   propuso, `/favorites` y `/history`) o viven dentro del menú desplegable del avatar de usuario en
   la topbar, dado que son datos "personales" y no de equipo?
7. **Auditoría — audiencia y ubicación:** el brief le da a Supervisor "revisa actividad de
   técnicos" y a Admin "supervisa calidad" — ¿ambos ven la misma pantalla `/admin/audit` con el
   mismo alcance, o Supervisor ve una vista acotada (solo su equipo/categoría) mientras Admin ve
   todo? ¿Auditoría merece salir de `/admin` y ser una entrada de nav propia dado que la consulta
   más de un rol?
8. **Comentarios dentro de un procedimiento:** ¿el hilo de comentarios se muestra siempre expandido
   en `/procedures/[id]`, o colapsado detrás de un tab/acordeón para no competir visualmente con el
   contenido técnico del procedimiento?
9. **Cola de revisión unificada o separada:** ¿una sola cola en `/procedures/review` que mezcla
   solicitudes de revisión de `Procedure` y aprobaciones pendientes de `Document`, o dos colas
   separadas dado que son flujos de aprobación distintos (uno con `ReviewRequest` formal, D5; el
   otro sin versión ni objeto de dominio equivalente)?
10. **Alcance real del caso mobile/tablet:** ¿vale la pena invertir en una experiencia tablet/mobile
    cuidada (técnicos en terreno junto a un tótem) o el uso real es 100% desde escritorio en
    oficina, y el comportamiento responsive de la sección 1.3 es sobre-ingeniería para un MVP?

---

## Siguiente paso

Con las confirmaciones de la sección 7 (y de la nota ⚠️ de la sección 3.1) se puede: (1) definir
wireframes de baja fidelidad para las pantallas de mayor riesgo de ambigüedad (`/ai`,
`/procedures/[id]`, cola de revisión), y (2) empezar a mapear componentes de Design System
reutilizables (`src/components/`, ARCHITECTURE.md §6) antes de tocar código de features.
