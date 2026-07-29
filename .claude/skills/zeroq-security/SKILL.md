---
name: zeroq-security
description: Project-specific security review checklist for ZeroQ Support Hub — OWASP Top 10, JWT/session handling, RBAC, XSS, SQL injection, CSRF, security headers, and rate limiting, mapped to this project's actual stack (Next.js Route Handlers, Auth.js, Prisma, Redis, Policy objects). Complements the generic getsentry security-review skill and the built-in /security-review command with checks specific to decisions made in ARCHITECTURE.md. Use before merging any change that touches auth, Route Handlers, file uploads, or the AI/RAG pipeline.
metadata:
  author: zeroq
  version: "1.0"
---

# Security Expert — ZeroQ Support Hub

ZeroQ Support Hub stores infrastructure and procedural details for banks, hospitals, and government
clients — a breach here is higher-stakes than a typical internal tool. Use this alongside the
generic `security-review` skill (getsentry) for anything project-specific that a generic OWASP
pass won't know to check.

## Session & auth (Auth.js / NextAuth)

- Sessions are **database-backed** (Prisma adapter), not JWT-only, per ARCHITECTURE.md §10 — this
  is deliberate: it allows revoking a session immediately (disable a user, they're locked out on
  their next request) instead of waiting for a JWT to expire. **Do not switch to the JWT session
  strategy** without flagging it as an architecture change — it silently reintroduces "can't revoke
  access instantly," which matters when someone leaves the team or a credential leaks.
- If any endpoint issues its own JWTs (e.g. for a future public API), verify: short expiry,
  signature algorithm pinned explicitly (never accept `alg: none` or let the library infer it from
  the token), secret/key rotated via env config not hardcoded, and `aud`/`iss` claims checked, not
  just signature validity.
- Password hashing: bcrypt or argon2 with a cost factor appropriate for current hardware — never
  roll your own, never store plaintext even "temporarily" in logs or audit entries.

## RBAC (Policy objects)

- The 5 roles (`admin, supervisor, engineer_l1, engineer_l2, readonly`) are enforced through
  `Policy` objects in `modules/*/application/policies`, per ARCHITECTURE.md §8 — **every** use case
  that mutates or exposes sensitive data must call its policy check before doing anything else, not
  after fetching data. A policy check performed after a repository call has already leaked the
  existence/shape of the data via timing or partial execution.
- Audit new use cases for this specifically: a `CreateProcedureUseCase` with no
  `CanCreateProcedurePolicy` check is a missing-authorization bug, not just a missing feature.
- Route Handlers must re-derive the user/role from the **server-side session**, never trust a
  `role` field sent in the request body or a client-supplied header — the policy check is only as
  strong as the identity it's checking against.

## CSRF — Route Handlers specifically

- Next.js **Server Actions** get built-in CSRF protection (origin header check) automatically.
  **Route Handlers do not** — a `POST /api/procedures/[id]/approve` Route Handler is a plain HTTP
  endpoint with no automatic CSRF defense.
- For any state-changing Route Handler reachable from a browser session cookie: verify the
  `Origin`/`Referer` header matches the expected app origin, or require a custom header
  (`X-Requested-With` or a fetched CSRF token) that a cross-site form post cannot set. This is a
  real gap to check explicitly — it's easy to assume Next.js "handles this" project-wide when it
  only does so for Server Actions.
- GET Route Handlers that have side effects (there shouldn't be any — flag them if found) are a
  CSRF vector by themselves regardless of the above.

## SQL injection

- Prisma's query builder parameterizes by default — low risk for standard `findMany`/`create`/etc.
- The one deliberate raw-SQL surface in this project is `PgVectorStore` (pgvector similarity search
  via `$queryRaw`/`$queryRawUnsafe`, ARCHITECTURE.md §10 D1). **Never** use `$queryRawUnsafe` with
  string-interpolated user input (search query text, filters) — use `Prisma.sql`/tagged-template
  `$queryRaw` with parameter placeholders even for the vector literal and any metadata filters
  (`categoryId`, `clientId`) added to the WHERE clause. Treat every new raw query touching
  `document_chunks` as a review point.

## XSS

- `ProcedureVersion.contentMarkdown` and `Comment.body` are user-authored rich content rendered
  back to other users — sanitize on render (a markdown renderer with a safe-by-default HTML
  policy, or explicit sanitization if raw HTML is ever allowed) not just on input; input-side
  sanitization alone breaks if the renderer changes later.
- AI-generated chat responses (`AIMessage.content`) are also rendered to the UI — treat model
  output as untrusted for rendering purposes too (a prompt injection in a source document could in
  principle cause the model to emit something with markup) even though the content didn't come
  from a form.
- File attachments: never render an uploaded SVG inline as `<img>` without stripping scripts, or
  serve user-uploaded files from the same origin as the app without a `Content-Disposition:
  attachment` or a sandboxed subdomain — classic stored-XSS-via-upload vector, directly relevant
  since this project supports image/PDF/config/log uploads.

## Rate limiting (Redis)

- AI chat/search endpoints (`/api/ai/chat`, `/api/search`) must be rate-limited per user — LLM
  calls are the most expensive request in this system and the most attractive target for abuse.
  Redis (already in the stack, ARCHITECTURE.md §10) is the natural backing store — a sliding-window
  or token-bucket counter keyed by `userId`.
- Auth endpoints (login) need their own, tighter rate limit independent of the AI one — brute-force
  protection is a different concern than cost control and should not share a budget with it.
- Return `429` with a `Retry-After` header, not a silent drop or a generic `500` — callers (and the
  Vercel AI SDK's streaming client) need to distinguish "rate limited" from "server error."

## Security headers

- Set via `next.config.js` `headers()` or middleware, applied globally: `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'` in CSP —
  this app has no legitimate reason to be iframed), `Content-Security-Policy` scoped to the app's
  actual script/style/connect sources (tighten this incrementally rather than starting from `*`).
- File download responses (attachments served from MinIO/S3) need their own
  `Content-Disposition`/`Content-Type` set explicitly by the serving code — don't rely on the
  storage adapter's default, which may echo back a client-supplied MIME type.

## OWASP Top 10 — points not covered above

- **A08 Software/Data Integrity:** the RAG indexing pipeline trusts approved `Procedure` content
  implicitly — if the approval workflow (`ReviewRequest`) itself has an authorization gap, bad
  content reaches the AI's context and is presented to every technician as fact. Treat the approval
  policy check as a security boundary, not just a workflow gate.
- **A09 Logging/Monitoring:** `AuditLog` (ARCHITECTURE.md §8, Decorator pattern) must capture who
  approved/rejected/deleted what — verify the decorator actually wraps every sensitive use case,
  not just the ones written first; a use case added later that forgets to opt in is a silent gap.
- **A05 Security Misconfiguration:** self-hosted MinIO/Redis/Postgres (ARCHITECTURE.md §10) means
  ZeroQ, not a cloud vendor, owns default-credential and network-exposure hygiene — verify these
  services are not reachable from outside the internal network/VPN, and that MinIO's default
  root credentials are rotated before any real client data is stored.
