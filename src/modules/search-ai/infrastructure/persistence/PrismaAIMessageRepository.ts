import { prisma } from "@/shared/infrastructure/prisma/client";
import type { AIMessageRepository } from "@/modules/search-ai/domain/ports";
import type { AIAnswerOrigin, AIMessage, SourceReference } from "@/modules/search-ai/domain/types";
import type { Prisma } from "../../../../../generated/prisma/client";

function mapMessage(row: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  sourceReferences: Prisma.JsonValue;
  answerOrigin: string | null;
  createdAt: Date;
}): AIMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as AIMessage["role"],
    content: row.content,
    // Json de Prisma no tiene forma propia (Prisma.JsonValue) — el shape real
    // lo garantiza este mismo repositorio al escribir (create()), nunca
    // input externo sin validar.
    sourceReferences: (row.sourceReferences as SourceReference[] | null) ?? null,
    answerOrigin: (row.answerOrigin as AIAnswerOrigin | null) ?? null,
    createdAt: row.createdAt,
  };
}

export class PrismaAIMessageRepository implements AIMessageRepository {
  async create(input: {
    conversationId: string;
    role: AIMessage["role"];
    content: string;
    sourceReferences: SourceReference[] | null;
    answerOrigin?: AIAnswerOrigin | null;
  }): Promise<AIMessage> {
    const row = await prisma.aIMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        sourceReferences: (input.sourceReferences ?? undefined) as Prisma.InputJsonValue | undefined,
        answerOrigin: input.answerOrigin ?? undefined,
      },
    });
    return mapMessage(row);
  }

  async listByConversation(conversationId: string): Promise<AIMessage[]> {
    const rows = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapMessage);
  }

  async listRecentByConversation(conversationId: string, limit: number): Promise<AIMessage[]> {
    const rows = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapMessage).reverse();
  }
}
