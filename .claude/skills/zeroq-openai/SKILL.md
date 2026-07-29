---
name: zeroq-openai
description: OpenAI API reference (Responses API, Embeddings, Structured Outputs, Vision, Function Calling, Streaming). Use when writing code that calls the OpenAI API directly, comparing it against the Anthropic/Voyage adapters already chosen in ZeroQ Support Hub's architecture, or implementing an LLMProvider/EmbeddingProvider adapter backed by OpenAI. No good public skill covered this comprehensively at authoring time, so it was written in-house.
metadata:
  author: zeroq
  version: "1.0"
---

# OpenAI API Expert

Reference for the OpenAI API surface relevant to ZeroQ Support Hub. **Read
[docs/architecture/ARCHITECTURE.md](../../../docs/architecture/ARCHITECTURE.md) §10 first** — the
project's default LLM is Anthropic Claude (adapter `LLMProvider`) and its default embeddings
provider is Voyage AI (adapter `EmbeddingProvider`), both chosen explicitly and pending your
confirmation on decision D2. This skill exists so that:

1. An OpenAI-backed adapter can be implemented correctly if D2 resolves in favor of OpenAI, or as
   a fallback/secondary provider (Ports & Adapters makes this a pure addition, not a rewrite).
2. Vision analysis of attachments (screenshots of tótem errors, hardware photos) can use GPT-4o/GPT-4.1
   Vision as an alternative to Claude's native vision if ever needed.
3. Any code touching the OpenAI SDK directly follows current best practice instead of stale
   patterns from training data (verify against `find-docs`/Context7 for anything version-sensitive).

## Responses API (not Chat Completions)

OpenAI's current primary API is the **Responses API** (`client.responses.create`), which
superseded Chat Completions and Assistants API for new integrations. Chat Completions still works
and is not deprecated, but new code in this project should default to Responses API.

- Single call model: `client.responses.create({ model, input, instructions, tools, stream })`.
- `input` accepts a string or a structured array of role/content items (mirrors chat messages but
  supports richer content parts — text, image, file).
- `instructions` replaces the old system message for top-level persona/steering — use this for the
  "Ingeniero Senior de Soporte ZeroQ" persona if this provider is ever wired as the active `LLMProvider`.
- Responses are stateful server-side by default (`previous_response_id` chains turns without
  resending full history) — relevant if building `AIConversation` continuation without re-sending
  the whole message array every turn.
- Prefer Responses API over Assistants API for anything new — Assistants API is on a deprecation path.

## Embeddings

- Endpoint: `client.embeddings.create({ model, input })`.
- Models: `text-embedding-3-small` (1536 dims, cheap, default choice for most RAG) and
  `text-embedding-3-large` (3072 dims, higher quality/cost). Both support a `dimensions` parameter
  to truncate output (Matryoshka-style) — e.g. request 1024 dims from `-3-large` to match a
  `vector(1024)` column without wasting the higher-quality model.
- Batch multiple `input` strings in one call (up to model-specific token/array limits) instead of
  one call per chunk — critical for the `IndexContentUseCase` chunking pipeline to control cost and
  latency.
- **If replacing Voyage AI in `EmbeddingProvider`:** the `document_chunks.embedding` column's
  `vector(N)` dimension is fixed at schema-creation time in pgvector — changing embedding model or
  dimension requires a migration and full re-embedding of existing chunks, not a config toggle.
  Flag this cost explicitly if D2 is revisited after data already exists.

## Structured Outputs

- Pass `response_format: { type: "json_schema", json_schema: {...}, strict: true }` (Responses API:
  `text.format`) to force the model to emit JSON matching an exact schema — the SDK guarantees
  schema conformance when `strict: true`, unlike free-form "please return JSON" prompting.
  - `strict: true` requires: every object property in `required`, `additionalProperties: false`,
    and no unsupported schema keywords (check current docs for the exact allow-list — this is the
    most common source of 400 errors).
- Use this for any use case that needs a typed result, e.g. `AnalyzeAttachmentUseCase` when a
  `FileAnalyzer` asks the LLM to classify a log's root cause into a fixed set of categories, or
  extracting `{ riskLevel, estimatedTimeMinutes, tags[] }` when a technician drafts a new
  `ProcedureVersion` and asks the AI to suggest metadata.
- Prefer Structured Outputs over asking the model to return JSON in prose and parsing it manually —
  eliminates an entire class of "AI returned malformed JSON" bugs.

## Vision

- Pass image content as a content part: `{ type: "input_image", image_url }` (URL or base64 data
  URI) alongside text in the same `input` array — no separate endpoint.
- Relevant to `AnalyzeAttachmentUseCase` → `ImageAnalyzer`: a technician uploads a photo of a tótem
  error screen or a printer's LED status, the model describes the visible symptom and can be asked
  (with Structured Outputs) to map it to a known `Category`/`ResolvedCase` pattern.
- Cost/latency note: vision tokens scale with image resolution — downscale/compress attachments
  before sending if only symptom identification is needed, not fine-grained OCR.

## Function Calling (Tools)

- Define tools as JSON-schema functions in the `tools` array; the model returns a `function_call`
  item in the response instead of (or alongside) text; the caller executes the function and sends
  the result back as a `function_call_output` input item to continue the turn.
- In this project's architecture, tool-calling is the mechanism by which `AskAIUseCase` could let
  the model *decide* to call `SemanticSearchUseCase` again with a refined query, or call a
  `FileAnalyzer` directly, instead of the use case always doing a single fixed retrieval pass —
  evaluate this as an evolution of the RAG pipeline in [[zeroq-rag]], not a day-one requirement.
- Keep tool definitions narrow and single-purpose (one tool = one use case), mirroring the
  Interactor pattern already used across `modules/*/application/use-cases` — don't expose a
  generic "run any query" tool.

## Streaming

- Pass `stream: true` to `responses.create`; iterate the returned async event stream
  (`response.output_text.delta` events carry incremental text, a final `response.completed` event
  carries the full response).
- This is what backs `/api/ai/chat`'s SSE response if OpenAI is ever the active `LLMProvider` —
  the Vercel AI SDK's `@ai-sdk/openai` adapter wraps this stream into the same `streamText()`
  interface already used for `@ai-sdk/anthropic`, so switching providers should not require
  touching the Route Handler, only the adapter in `search-ai/infrastructure/llm/`.

## Rate limits & error handling

- Respect `x-ratelimit-remaining-requests` / `-tokens` response headers; back off on 429 with the
  `retry-after` header rather than a fixed sleep.
- Distinguish retryable errors (429, 500, 503) from non-retryable ones (400 invalid request, 401
  auth) — only the former should hit the use case's retry logic; the latter should surface as a
  `DomainError` via the `Result` type per the project's error-handling convention (no throwing
  across layers, see ARCHITECTURE.md §8).
