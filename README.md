# ZeroQ Support Hub

Centro de Conocimiento Inteligente para el área de Soporte Técnico de ZeroQ, orientado a la
operación de tótems, módulos de atención, pantallas, impresoras térmicas y servidores
Linux/Docker/PostgreSQL/Redis.

La plataforma no constituye un sistema de tickets ni una wiki convencional: es una base
documental versionada y sujeta a revisión (**Bitácora**), complementada con búsqueda semántica
híbrida y un asistente de inteligencia artificial (RAG) que responde exclusivamente en base al
conocimiento interno, citando siempre la fuente exacta que respalda cada afirmación.

Para el diseño arquitectónico completo (contextos delimitados, agregados, decisiones técnicas),
consultar [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md). Este documento
cubre exclusivamente la puesta en marcha del proyecto.

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Puesta en marcha (entorno local)](#puesta-en-marcha-entorno-local)
4. [Credenciales de prueba](#credenciales-de-prueba)
5. [Despliegue a producción (Vercel)](#despliegue-a-producción-vercel)
6. [Documentación adicional](#documentación-adicional)

---

## Stack tecnológico

### Framework y lenguaje

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 16.2.11 | Framework fullstack — App Router, Server Components, Route Handlers, Turbopack |
| React | 19.2.8 | Biblioteca de interfaz de usuario |
| TypeScript | 6.0.3 | Lenguaje, modo estricto en todo el proyecto |
| Tailwind CSS | 4.3.3 | Estilos — configuración CSS-first, sin `tailwind.config.js` |

### Datos y persistencia

| Tecnología | Versión | Rol |
|---|---|---|
| PostgreSQL | — (Supabase) | Motor de base de datos principal |
| Prisma | 7.9.0 | ORM — cliente y motor de migraciones |
| `@prisma/adapter-pg` | 7.9.0 | Adaptador de driver de Prisma sobre `pg` |
| `pg` | 8.22.0 | Driver nativo de PostgreSQL para Node.js |
| pgvector | — | Extensión de PostgreSQL para búsqueda vectorial (`halfvec(1024)`, índice HNSW) — sin motor de vectores externo |
| Supabase Storage | — | Almacenamiento de archivos (módulo Documentación) |
| `@supabase/supabase-js` | 2.110.8 | Cliente de Supabase (Storage) |

### Autenticación y autorización

| Tecnología | Versión | Rol |
|---|---|---|
| Auth.js (NextAuth) | 5.0.0-beta.32 | Autenticación — proveedor Credentials, sesión JWT sin adaptador de base de datos |
| `bcryptjs` | 3.0.3 | Hashing de contraseñas |
| Policy objects (interno) | — | Autorización basada en 5 roles fijos (`admin`, `supervisor`, `engineer_l1`, `engineer_l2`, `readonly`) |

### Inteligencia artificial y búsqueda (RAG)

| Tecnología | Versión | Rol |
|---|---|---|
| Vercel AI SDK (`ai`) | 7.0.36 | Capa de abstracción sobre modelos de lenguaje |
| `@ai-sdk/anthropic` | 4.0.18 | Proveedor Anthropic (Claude) |
| `@ai-sdk/openai` | 4.0.19 | Proveedor OpenAI |
| `@ai-sdk/azure` | 4.0.20 | Proveedor Azure OpenAI |
| `@ai-sdk/groq` | 4.0.17 | Proveedor Groq — nivel gratis real, alcanzable desde Vercel (recomendado para producción sin costo) |
| `ollama-ai-provider-v2` | 4.0.1 | Proveedor Ollama (autoalojado — solo desarrollo local, no alcanzable desde Vercel) |
| `@ai-sdk/voyage` | 2.0.12 | Proveedor de embeddings — Voyage AI (`voyage-4-lite`, 1024 dimensiones, fijo) |
| `@tavily/core` | 0.7.6 | Búsqueda web para el asistente (tool-calling) |

> El proveedor de LLM es intercambiable en tiempo de ejecución mediante la variable de entorno
> `LLM_PROVIDER` (`anthropic` | `openai` | `azure-openai` | `groq` | `ollama`), sin modificar
> código. El proveedor de embeddings es fijo por decisión de diseño (cambiarlo exige reprocesar el
> corpus completo).

### Procesamiento de documentos

| Tecnología | Versión | Rol |
|---|---|---|
| `pdf-parse` | 2.4.5 | Extracción de texto de archivos PDF |
| `mammoth` | 1.12.0 | Extracción de texto de archivos Word (`.docx`) |
| `react-markdown` | 10.1.0 | Renderizado seguro de contenido Markdown |

### Interfaz de usuario

| Tecnología | Versión | Rol |
|---|---|---|
| `@radix-ui/react-dialog` | 1.1.23 | Primitivo accesible para diálogos de confirmación |
| `lucide-react` | 1.28.0 | Biblioteca de iconografía |

### Validación y utilidades

| Tecnología | Versión | Rol |
|---|---|---|
| `zod` | 4.4.3 | Validación de esquemas en los límites de la aplicación (Route Handlers, formularios) |
| `dotenv` | 17.4.2 | Carga de variables de entorno en scripts fuera del runtime de Next.js |

### Herramientas de desarrollo

| Tecnología | Versión | Rol |
|---|---|---|
| ESLint | 10.7.0 | Análisis estático de código |
| `eslint-config-next` | 16.2.11 | Reglas de ESLint específicas de Next.js |
| `tsx` | 4.23.1 | Ejecución de scripts TypeScript (seed, migraciones auxiliares) |

### Infraestructura y despliegue

| Tecnología | Rol |
|---|---|
| Vercel | Hosting, build y despliegue continuo |
| Supabase | Base de datos PostgreSQL administrada y almacenamiento de archivos |
| `after()` (Next.js) | Ejecución de trabajo en segundo plano que sobrevive a la respuesta HTTP (sin cola externa tipo Redis/BullMQ) |

---

## Estructura del proyecto

El proyecto aplica Clean Architecture por módulo, no por capas globales: cada contexto delimitado
posee su propia capa `domain/` (reglas de negocio puras, sin dependencias de framework),
`application/` (casos de uso) e `infrastructure/` (Prisma, Supabase, adaptadores de proveedores de
IA).

```
src/
├── app/                    Next.js App Router — exclusivamente presentación
│   ├── (auth)/              Rutas de autenticación (/login)
│   ├── (dashboard)/         Pantallas autenticadas
│   └── api/                 Route Handlers (chat de IA en streaming, conversaciones,
│                            búsqueda, autenticación)
├── modules/
│   ├── identity/            Usuarios, roles, políticas de acceso
│   ├── knowledge/           Procedimientos (Bitácora), Documentación, Categorías,
│                            Favoritos, Historial
│   └── search-ai/           RAG: embeddings, búsqueda híbrida, chat con memoria semántica
├── shared/                  Núcleo compartido — cliente de Prisma, Supabase Storage,
│                            ejecución de trabajo en segundo plano
├── components/               Interfaz compartida (layout, chat, formularios)
└── lib/                      Esquemas de validación (Zod), utilidades de interfaz

prisma/
├── schema.prisma
├── migrations/              Historial de migraciones versionado por Prisma
└── manual-sql/              Sentencias SQL que Prisma no puede expresar nativamente
                             (extensión vector, índices HNSW, columna generada tsvector)
                             — ver README de la carpeta para el orden exacto de aplicación

docs/architecture/           Diseño completo, decisiones técnicas y diagramas
```

> **Nota sobre el alcance de los módulos:** el diseño original documentado en
> `ARCHITECTURE.md` (secciones 3 y 4) contemplaba además los contextos Dashboard, Casos Resueltos
> y Clientes. Estos fueron implementados y posteriormente eliminados en su totalidad por falta de
> uso real. El estado actual del código comprende únicamente `identity`, `knowledge` y
> `search-ai`.

---

## Puesta en marcha (entorno local)

### Requisitos previos

- Node.js 20 o superior.
- Un proyecto de [Supabase](https://supabase.com) (PostgreSQL + Storage) — el plan gratuito es
  suficiente.
- Al menos una credencial de API de un proveedor de LLM: [Anthropic](https://console.anthropic.com),
  [OpenAI](https://platform.openai.com), Azure OpenAI, o [Ollama](https://ollama.com) en ejecución
  local (sin costo, aunque limitado a uso en desarrollo — ver advertencia en la sección de
  despliegue).
- Credencial de API de [Voyage AI](https://www.voyageai.com) (embeddings; incluye una cuota
  gratuita).
- Credencial de API de [Tavily](https://tavily.com) (búsqueda web del asistente; incluye una
  cuota gratuita mensual).

### 1. Instalación de dependencias

```bash
npm install
```

El script `postinstall` ejecuta `prisma generate` automáticamente.

### 2. Configuración de variables de entorno

```bash
cp .env.example .env
```

Completar cada variable siguiendo las referencias documentadas en `.env.example`. Para generar
`AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Preparación de la base de datos

El proyecto contiene elementos que Prisma no puede expresar de forma nativa (extensión `vector`,
índices HNSW, una columna generada de tipo `tsvector`). Estos se aplican manualmente, **en el
siguiente orden** (detalle completo en
[`prisma/manual-sql/README.md`](prisma/manual-sql/README.md)):

1. `prisma/manual-sql/pre-migrate.sql` — habilita la extensión `pgvector` (ejecutar contra
   `DIRECT_URL`, antes de crear las tablas).
2. `npx prisma migrate deploy` — aplica el historial de migraciones versionado.
3. `prisma/manual-sql/post-migrate.sql` — crea el índice HNSW y la columna `tsvector` para
   búsqueda híbrida.
4. `prisma/manual-sql/003-remove-cases-clients-dashboard.sql`
5. `prisma/manual-sql/004-add-view-history.sql`
6. `prisma/manual-sql/005-add-ai-answer-cache.sql`

Las sentencias SQL se aplican con cualquier cliente de PostgreSQL (`psql`, o un script breve con
`pg.Client` contra `DIRECT_URL`). **No debe utilizarse `prisma migrate dev`** para este proyecto:
dicho comando detecta estos elementos manuales como cambios no declarados ("drift") e intenta
revertirlos.

### 4. Carga de datos de ejemplo

```bash
npm run db:seed
```

Crea un usuario de demostración por cada uno de los cinco roles del sistema (ver sección
siguiente).

### 5. Ejecución del servidor de desarrollo

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000/login`.

---

## Credenciales de prueba

> ⚠️ **Advertencia de seguridad.** Estas credenciales son de conocimiento público: están
> hardcodeadas en `prisma/seed.ts`, versionado en este repositorio. Su único propósito es
> facilitar la evaluación funcional del sistema. **No deben utilizarse para proteger datos
> sensibles ni operativos reales.** Si esta plataforma pasa a manejar información operativa
> genuina (por ejemplo, procedimientos internos con credenciales de infraestructura de clientes),
> es imprescindible reemplazar estas contraseñas por credenciales privadas antes de habilitar el
> acceso.

Contraseña única para los cinco usuarios de demostración: **`ZeroQ.Demo123`**

| Rol | Correo electrónico |
|---|---|
| Administrador | `admin@zeroq.local` |
| Supervisor | `supervisor@zeroq.local` |
| Ingeniero N1 | `n1@zeroq.local` |
| Ingeniero N2 | `n2@zeroq.local` |
| Solo lectura | `readonly@zeroq.local` |

---

## Despliegue a producción (Vercel)

1. Conectar el repositorio a un proyecto de Vercel.
2. Cargar la totalidad de las variables definidas en `.env.example` en Vercel → Settings →
   Environment Variables, ambiente **Production**. Utilizar un valor de `AUTH_SECRET` distinto
   al empleado en desarrollo.
3. **`LLM_PROVIDER=ollama` no es funcional en Vercel**: Ollama se ejecuta localmente y las
   funciones serverless de Vercel no pueden acceder a él. En producción debe utilizarse
   `anthropic`, `openai`, `azure-openai` o `groq`, junto con la credencial correspondiente.
   **Groq** es la opción recomendada si se busca evitar costo: tiene nivel gratuito real
   (sin tarjeta) y es alcanzable desde Vercel — bastan `LLM_PROVIDER="groq"` y
   `GROQ_API_KEY` (obtenida en [console.groq.com/keys](https://console.groq.com/keys)).
4. El comando `npm run build` ejecuta `next build`; el cliente de Prisma se regenera
   automáticamente mediante el script `postinstall`.
5. La preparación de la base de datos (pasos 1 a 6 de la sección anterior) se realiza una única
   vez, directamente contra el proyecto de Supabase — no forma parte del proceso de build de
   Vercel.

---

## Documentación adicional

| Documento | Contenido |
|---|---|
| [`ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | Diseño arquitectónico completo, patrones aplicados, decisiones técnicas |
| [`AI_RAG_DESIGN.md`](docs/architecture/AI_RAG_DESIGN.md) | Pipeline de RAG, retrieval híbrido, memoria semántica del asistente |
| [`DATABASE_DESIGN.md`](docs/architecture/DATABASE_DESIGN.md) | Modelo de datos |
| [`USE_CASES.md`](docs/architecture/USE_CASES.md) | Casos de uso por rol |
| [`UI_UX_DESIGN.md`](docs/architecture/UI_UX_DESIGN.md) | Diseño de interfaz |
| [`ROADMAP.md`](docs/architecture/ROADMAP.md) | Estado de las fases del proyecto |
| [`prisma/manual-sql/README.md`](prisma/manual-sql/README.md) | Justificación y orden de aplicación del SQL manual |
