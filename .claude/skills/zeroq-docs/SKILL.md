---
name: zeroq-docs
description: Documentation engineering for ZeroQ Support Hub — generates README, OpenAPI/Swagger specs, changelogs, Mermaid diagrams, technical manuals, and user manuals consistent with this project's existing docs (ARCHITECTURE.md) and bounded-context structure. Use whenever asked to document a module, generate API docs, write a changelog entry, or produce a user-facing manual. Complements the generic anthropics documentation skill with ZeroQ-specific conventions and outputs.
metadata:
  author: zeroq
  version: "1.0"
---

# Documentation Engineer — ZeroQ Support Hub

Generates the documentation deliverables the project needs, in the conventions already established
by [docs/architecture/ARCHITECTURE.md](../../../docs/architecture/ARCHITECTURE.md). Use the generic
`documentation` skill for general technical-writing judgment; use this one for ZeroQ-specific
structure, tone, and where things live.

## Where documentation lives

```
docs/
├── architecture/
│   ├── ARCHITECTURE.md        # living source of truth — update, don't fork
│   └── adr/                   # NNNN-title.md, one decision per file (see §3)
├── api/
│   └── openapi.yaml           # generated/maintained spec (see §2)
├── manuals/
│   ├── tecnico/               # per-module technical manuals (see §4)
│   └── usuario/               # per-role user manuals (see §5)
└── CHANGELOG.md                # see §6
```

Don't invent a different location for a new doc type without checking here first — a second
"docs2" folder or a manual dropped in the repo root is the kind of drift this skill exists to
prevent.

## 1. README

- Root `README.md`: project purpose (2-3 sentences, pulled from ARCHITECTURE.md §1, not
  re-derived from scratch), local setup (env vars via `config/env.ts`, `docker-compose up` for
  Postgres/Redis/MinIO, `prisma migrate dev`), and a pointer to `docs/architecture/ARCHITECTURE.md`
  for anything beyond "how do I run this."
- Per-module `README.md` (optional, only for `modules/*` with non-obvious setup, e.g.
  `search-ai` needing API keys) — most modules should be self-explanatory from
  domain/application/infrastructure structure and don't need one.
- Never duplicate content that already lives in ARCHITECTURE.md — link to the section instead of
  re-explaining bounded contexts, entities, or patterns.

## 2. API documentation (OpenAPI/Swagger)

- Source of truth is the Zod schemas already used at the Route Handler boundary
  (`src/lib` per ARCHITECTURE.md §6) — generate the OpenAPI spec from those schemas (e.g.
  `zod-to-openapi`) rather than hand-writing a parallel spec that will drift.
- Document per Route Handler: method, path, auth requirement (which roles per the Policy objects
  in ARCHITECTURE.md §8 — e.g. "requires `supervisor` or `admin`"), request/response shape, and
  error codes actually returned by that handler's `Result`-to-`NextResponse` mapping.
- Streaming endpoints (`/api/ai/chat`) can't be fully described by OpenAPI's request/response model
  — document the SSE event shape in prose alongside the spec entry, not forced into it.

## 3. Architecture Decision Records (ADRs)

- One ADR per consequential decision, `docs/architecture/adr/NNNN-short-title.md`, sequential
  numbering, never renumbered/deleted after acceptance (supersede with a new ADR instead).
- Format: Context → Decision → Consequences (including negative ones) → Alternatives considered.
- The 7 open decisions in ARCHITECTURE.md §11 (D1–D7) should each become an ADR once resolved —
  don't leave the resolution only as a chat answer; the "why" needs to survive beyond this
  conversation.
- If a project skill (`skills add`) or a package choice materially shapes the architecture (e.g.
  choosing BullMQ over a managed queue), it deserves an ADR too, not just a line in a skill file.

## 4. Manual Técnico (per bounded context)

Audience: engineers (N1/N2) onboarding onto a module. One file per bounded context in
`docs/manuals/tecnico/`, structured:

1. Purpose (1 paragraph, why this context exists — pull from ARCHITECTURE.md §3/§4)
2. Aggregates and invariants (table, same shape as ARCHITECTURE.md §5.1)
3. Key use cases with a one-line description each
4. External dependencies (ports/adapters this module owns, e.g. `search-ai` → LLMProvider,
   EmbeddingProvider, VectorStore)
5. Common failure modes and where to look (which logs, which table, which policy is most likely
   the cause of a 403)

Generate a Mermaid diagram per manual only when it clarifies something prose can't — a sequence
diagram for the RAG query flow (already in ARCHITECTURE.md §9) is worth it; a diagram for a simple
CRUD flow is noise.

## 5. Manual de Usuario (per role)

Audience: the 5 roles from ARCHITECTURE.md §5.2 (`admin`, `supervisor`, `engineer_l1`,
`engineer_l2`, `readonly`). One short manual per role in `docs/manuals/usuario/`, scoped strictly
to what that role can do — don't write one giant manual and tell readers to skip sections; a
`readonly` user's manual should not even mention approval workflows they'll never see.

Structure per role manual: what you can do (bullet list mirroring the brief's per-role action
list) → walkthrough of the 1-2 most common tasks with screenshots/steps → where to ask for help
(escalation path to the role above).

## 6. Changelog

- `docs/CHANGELOG.md`, Keep a Changelog format (`Added/Changed/Fixed/Removed` under each version
  heading), oriented at engineers reading it to understand what shipped — not a raw commit log.
- Entries should name the bounded context affected (e.g. "**Knowledge:** procedures can now be
  tagged with multiple categories") so a reader scanning history for "what changed in search-ai"
  can find it fast.
- Generate from merged PRs/commits since the last tagged version, but rewrite each into a
  user/engineer-facing sentence — don't paste raw commit messages in.

## 7. Diagrams

- Mermaid only (renders natively in GitHub, this repo's Markdown viewer, and Claude artifacts) —
  no external diagram tool requiring a separate export step that goes stale.
- Reuse the diagram conventions already established in ARCHITECTURE.md: `graph TB` for context
  maps, `erDiagram` for data model, `sequenceDiagram` for flows. Don't introduce a fourth diagram
  style without a reason.
