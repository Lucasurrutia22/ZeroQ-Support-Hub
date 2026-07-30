import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Prisma } from "../../../../../generated/prisma/client";
import type {
  AnswerCacheStore,
  CachedAnswer,
  SaveCachedAnswerInput,
} from "@/modules/search-ai/domain/ports";
import type { SourceReference } from "@/modules/search-ai/domain/types";
import { toHalfvecLiteral } from "./halfvec";

// Memoria semántica del chat — segundo (y único otro) lugar del proyecto que
// escribe SQL raw con `halfvec`, mismo estilo que PgVectorStore (placeholders
// de Prisma.$queryRaw/$executeRaw, nunca interpolación de string).
const CACHE_TTL_DAYS = 30;

interface RawCachedAnswerRow {
  id: string;
  answerContent: string;
  sourceReferences: Prisma.JsonValue;
  similarity: number;
}

export class PgAnswerCacheStore implements AnswerCacheStore {
  async findSimilar(embedding: number[], minSimilarity: number): Promise<CachedAnswer | null> {
    const vectorLiteral = toHalfvecLiteral(embedding);

    const rows = await prisma.$queryRaw<RawCachedAnswerRow[]>`
      SELECT id, "answerContent", "sourceReferences",
        1 - (embedding <=> ${vectorLiteral}::halfvec(1024)) AS similarity
      FROM "AICachedAnswer"
      WHERE "createdAt" > now() - (${CACHE_TTL_DAYS} * interval '1 day')
      ORDER BY embedding <=> ${vectorLiteral}::halfvec(1024)
      LIMIT 1
    `;

    const top = rows[0];
    if (!top || top.similarity < minSimilarity) return null;

    return {
      id: top.id,
      answerContent: top.answerContent,
      sourceReferences: top.sourceReferences as unknown as SourceReference[],
    };
  }

  async save(input: SaveCachedAnswerInput): Promise<void> {
    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "AICachedAnswer"
        (id, "questionText", "answerContent", "sourceReferences", embedding)
      VALUES (
        ${id},
        ${input.questionText},
        ${input.answerContent},
        ${JSON.stringify(input.sourceReferences)}::jsonb,
        ${toHalfvecLiteral(input.embedding)}::halfvec(1024)
      )
    `;

    // Volumen esperado de citas por respuesta es bajo (RETRIEVAL_TOP_K=8 como
    // máximo teórico) — un INSERT por cita, mismo criterio que
    // PgVectorStore.insertChunks.
    for (const procedureId of input.procedureIds) {
      await prisma.$executeRaw`
        INSERT INTO "AICachedAnswerCitation" (id, "cachedAnswerId", "procedureId")
        VALUES (${randomUUID()}, ${id}, ${procedureId})
      `;
    }
  }

  async recordHit(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "AICachedAnswer"
      SET "hitCount" = "hitCount" + 1, "lastHitAt" = now()
      WHERE id = ${id}
    `;
  }

  async invalidateByProcedureId(procedureId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM "AICachedAnswer"
      WHERE id IN (
        SELECT "cachedAnswerId" FROM "AICachedAnswerCitation" WHERE "procedureId" = ${procedureId}
      )
    `;
  }
}
