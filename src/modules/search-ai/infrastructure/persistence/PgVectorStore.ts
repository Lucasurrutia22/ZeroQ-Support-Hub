import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/prisma/client";
import { Prisma } from "../../../../../generated/prisma/client";
import type { DocumentChunkSourceType, ScoredChunk } from "@/modules/search-ai/domain/types";
import type {
  HybridSearchInput,
  NewChunkInput,
  VectorStore,
} from "@/modules/search-ai/domain/ports";

// pgvector sobre el mismo Postgres (D1) — único lugar del proyecto que
// escribe SQL raw contra `DocumentChunk`. Todo parámetro variable (embedding,
// texto de búsqueda, filtros) se pasa por placeholder de Prisma.sql/
// $queryRaw, NUNCA por interpolación de string (zeroq-security: SQL
// injection — el único raw-SQL surface del proyecto es justo este).
//
// halfvec en vez de vector(1024) (refinamiento vs. ARCHITECTURE.md §5.2
// original, ver nota en schema.prisma) — golden path de la skill
// pgvector-semantic-search: cosine (<=>), índice HNSW, cast explícito del
// vector de consulta.
const RRF_K = 60;
const CANDIDATE_POOL_SIZE = 30;

interface RawChunkRow {
  id: string;
  sourceType: DocumentChunkSourceType;
  sourceId: string;
  content: string;
  chunkIndex: number;
  categoryId: string | null;
  clientId: string | null;
}

function toHalfvecLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function buildFilterClause(filters: HybridSearchInput["filters"]): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (filters?.categoryId) {
    conditions.push(Prisma.sql`"categoryId" = ${filters.categoryId}`);
  }
  if (filters?.clientId) {
    conditions.push(Prisma.sql`"clientId" = ${filters.clientId}`);
  }
  if (conditions.length === 0) return Prisma.sql``;
  return Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`;
}

export class PgVectorStore implements VectorStore {
  async deleteBySource(
    sourceType: DocumentChunkSourceType,
    sourceIds: string[],
  ): Promise<void> {
    if (sourceIds.length === 0) return;
    await prisma.$executeRaw`
      DELETE FROM "DocumentChunk"
      WHERE "sourceType" = ${sourceType}::"DocumentChunkSourceType"
        AND "sourceId" = ANY(${sourceIds})
    `;
  }

  async insertChunks(chunks: NewChunkInput[]): Promise<void> {
    // Un INSERT por chunk: simple y suficiente para el volumen esperado
    // (~5-15 chunks por Procedure/ResolvedCase) corriendo async fuera del
    // request del usuario (ContentIndexer.indexAsync). Si el volumen crece
    // mucho, es un cambio local a este método (VALUES multi-fila), no un
    // cambio de contrato del port.
    for (const chunk of chunks) {
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk"
          (id, "sourceType", "sourceId", content, "chunkIndex", "categoryId", "clientId", embedding)
        VALUES (
          ${randomUUID()},
          ${chunk.sourceType}::"DocumentChunkSourceType",
          ${chunk.sourceId},
          ${chunk.content},
          ${chunk.chunkIndex},
          ${chunk.categoryId},
          ${chunk.clientId},
          ${toHalfvecLiteral(chunk.embedding)}::halfvec(1024)
        )
      `;
    }
  }

  async hybridSearch(input: HybridSearchInput): Promise<ScoredChunk[]> {
    const filterClause = buildFilterClause(input.filters);
    const vectorLiteral = toHalfvecLiteral(input.queryEmbedding);

    const [vectorRows, textRows] = await Promise.all([
      prisma.$queryRaw<RawChunkRow[]>`
        SELECT id, "sourceType", "sourceId", content, "chunkIndex", "categoryId", "clientId"
        FROM "DocumentChunk"
        WHERE true ${filterClause}
        ORDER BY embedding <=> ${vectorLiteral}::halfvec(1024)
        LIMIT ${CANDIDATE_POOL_SIZE}
      `,
      prisma.$queryRaw<RawChunkRow[]>`
        SELECT id, "sourceType", "sourceId", content, "chunkIndex", "categoryId", "clientId"
        FROM "DocumentChunk"
        WHERE "contentSearch" @@ plainto_tsquery('spanish', ${input.queryText}) ${filterClause}
        ORDER BY ts_rank("contentSearch", plainto_tsquery('spanish', ${input.queryText})) DESC
        LIMIT ${CANDIDATE_POOL_SIZE}
      `,
    ]);

    return fuseRankedLists(vectorRows, textRows).slice(0, input.topK);
  }
}

// Boost de confianza (zeroq-rag §5 / AI_RAG_DESIGN.md §5): a igual score, un
// chunk de Procedure (contenido revisado/aprobado) se prioriza sobre uno de
// ResolvedCase (no revisado). Se aplica como multiplicador chico sobre el
// score de RRF ya calculado, no como una señal de ranking aparte.
const PROCEDURE_TRUST_BOOST = 1.05;

// Reciprocal Rank Fusion (AI_RAG_DESIGN.md §5): score = Σ 1/(k + rank_i)
// sobre las dos listas rankeadas, sin pesos calibrados a mano.
function fuseRankedLists(vectorRows: RawChunkRow[], textRows: RawChunkRow[]): ScoredChunk[] {
  const scores = new Map<string, number>();
  const rowById = new Map<string, RawChunkRow>();

  function accumulate(rows: RawChunkRow[]) {
    rows.forEach((row, index) => {
      rowById.set(row.id, row);
      const rank = index + 1;
      const previous = scores.get(row.id) ?? 0;
      scores.set(row.id, previous + 1 / (RRF_K + rank));
    });
  }

  accumulate(vectorRows);
  accumulate(textRows);

  return Array.from(scores.entries())
    .map(([id, rrfScore]) => {
      const row = rowById.get(id);
      if (!row) throw new Error("Fila de document_chunks perdida durante la fusión RRF");
      const score =
        row.sourceType === "procedure_version" ? rrfScore * PROCEDURE_TRUST_BOOST : rrfScore;
      return { ...row, score };
    })
    .sort((a, b) => b.score - a.score);
}
