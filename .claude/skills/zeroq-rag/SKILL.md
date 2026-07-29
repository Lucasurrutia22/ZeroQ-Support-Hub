---
name: zeroq-rag
description: RAG (Retrieval-Augmented Generation) pipeline design and implementation guidance specific to ZeroQ Support Hub — chunking, embeddings, pgvector, retrieval, ranking, hybrid search, and prompt engineering for the "Ingeniero Senior de Soporte ZeroQ" persona. Use whenever building or modifying the search-ai module, the indexing pipeline, or the AI chat use case. Written in-house because public RAG skills are tied to frameworks (LangChain) this project deliberately does not use.
metadata:
  author: zeroq
  version: "1.0"
---

# RAG Expert — ZeroQ Support Hub

This encodes the RAG architecture already decided in
[docs/architecture/ARCHITECTURE.md](../../../docs/architecture/ARCHITECTURE.md) §9. Read that
section first — this skill is the implementation-level companion to it, not a replacement.

**Framework stance:** no LangChain/LlamaIndex. The pipeline is built directly on our own
`Ports & Adapters` (`LLMProvider`, `EmbeddingProvider`, `VectorStore` in
`modules/search-ai/application/ports`) so it stays swappable and dependency-light. Do not introduce
a RAG framework without flagging it as an architecture decision first — it would bypass the
Ports & Adapters boundary already agreed on.

## 1. What gets indexed, and when

Only **approved** content is indexed:
- `Procedure` → triggers on `ProcedureApproved` domain event (not on every edit — draft/in-review
  content must never leak into AI answers).
- `ResolvedCase` → triggers on `ResolvedCaseCreated` (cases don't have a review workflow; they're
  indexed immediately, but see §5 on citing them with appropriately lower confidence than approved
  procedures).

Indexing is asynchronous (BullMQ job), never inline in the request that approves/creates the
content — an approval action must not block on embedding latency.

## 2. Chunking strategy

- Chunk by semantic unit, not fixed character count where avoidable: split a `ProcedureVersion`'s
  markdown by heading (`##`) first, then sub-split any section still over the token budget.
- Target ~300–500 tokens per chunk with ~15% overlap between adjacent chunks — small enough for
  precise retrieval, large enough to keep a command + its explanation together.
- Always store chunk metadata alongside the vector: `sourceType`, `sourceId`, `chunkIndex`,
  `categoryId`, `clientId` (for cases) — retrieval filters on these before/after the vector search
  (see §4), and citations in `AIMessage.sourceReferences` need them to build a human-readable link
  back to the `Procedure`/`ResolvedCase`.
- Re-chunk and re-embed the **entire** procedure on every new approved version — don't try to diff
  old vs. new chunks. Simpler, and versioning already gives you the audit trail (old chunks from a
  superseded version should be deleted, not left to compete in retrieval).
- Code blocks (commands, `docker-compose.yml` snippets, `.env` examples) should stay in their own
  chunk, never split mid-block — splitting a command across chunks makes it retrievable but useless.

## 3. Embeddings

- Default provider: Voyage AI (`voyage-3`, 1024 dims) per ARCHITECTURE.md D2 — pending your
  confirmation; see [[zeroq-openai]] for the OpenAI alternative if D2 resolves differently.
- Embed the **query** with the same model/dimension as the corpus — a query embedded with a
  different model than the stored chunks will silently return poor-quality matches (no error, just
  bad relevance), so the `EmbeddingProvider` adapter must be the single source of truth for which
  model is active, never hardcoded per call site.
- Voyage supports an `input_type` parameter (`document` vs `query`) that measurably improves
  retrieval quality when set correctly on each side — set `document` when embedding chunks at index
  time and `query` when embedding the user's question at search time.

## 4. Retrieval

- Base retrieval: pgvector cosine similarity (`<=>` operator) via `PgVectorStore.similaritySearch(vector, topK)`.
- Apply metadata filters *before* the vector search when the query context supports it (e.g. user
  is viewing a specific `Client`'s page and asks a question — filter `clientId` first, then rank by
  similarity within that subset) — cheaper and more relevant than filtering after the fact.
- **Hybrid search:** combine vector similarity with PostgreSQL full-text search
  (`ts_rank` / `plainto_tsquery` on chunk content) for queries containing exact tokens that
  embeddings alone under-weight — error codes, model numbers, exact command names (e.g.
  `"docker-compose logs"`, `"E-42"`). Reciprocal Rank Fusion (RRF) is a simple, well-tested way to
  merge the two ranked lists without hand-tuned weights: `score = Σ 1/(k + rank_i)` across the
  vector-rank and text-rank lists, `k≈60`.
- Default `topK` for the chunks passed into the LLM context: 6–10. Wider isn't better past that —
  it dilutes the context and increases the chance the model cites something tangential.

## 5. Ranking & trust signals

- Boost `Procedure` chunks over `ResolvedCase` chunks at equal similarity — procedures are reviewed
  content, cases are not.
- Surface `riskLevel` and `estimatedTimeMinutes` from the source `Procedure` alongside retrieved
  chunks — the brief explicitly asks the AI to report risk/time, not just the procedure text.
- Consider a lightweight re-ranking pass (cross-encoder or an LLM-as-judge call) only if retrieval
  quality in practice proves the embedding-similarity ranking insufficient — don't add this
  complexity speculatively; it's a real latency/cost cost for an MVP.

## 6. Prompt engineering — the "Ingeniero Senior" persona

- System/instructions prompt must establish: (a) the assistant is a senior ZeroQ support engineer,
  (b) it answers **only** from the retrieved context, (c) if the context doesn't cover the question
  it says so explicitly rather than guessing from general knowledge — this is a hard product
  requirement ("utilizando exclusivamente la documentación interna"), not a nice-to-have.
- Every retrieved chunk passed into context must carry an identifier the model can cite by (e.g.
  `[PROC-142-v3]`, `[CASE-88]`) — instruct the model to inline these citation tags in its answer,
  then map them back to `sourceReferences` when persisting the `AIMessage`. Never accept a
  generated answer that has no mapped citation — that violates the traceability invariant in
  ARCHITECTURE.md §5.1 (`AIConversation` aggregate).
- Ask explicitly for the structured fields the brief lists: procedimientos aplicables, comandos,
  advertencias, casos similares, nivel de riesgo, tiempo estimado, archivos relacionados — either
  via a Structured Output schema (see [[zeroq-openai]] §Structured Outputs, or Claude's tool-use
  equivalent) if the UI renders these as distinct fields, or as a consistent markdown structure if
  rendered as free text.

## 7. File analysis as retrieval-adjacent, not a replacement for it

`AnalyzeAttachmentUseCase` (logs, `docker-compose.yml`, `.env`, images) should, after extracting
the technical signal from the file (error strings, service names, image description), run that
signal back through the same retrieval pipeline (§4) to find matching procedures/cases — a log
analyzer that doesn't consult the knowledge base duplicates diagnosis effort the RAG pipeline
already solves.
