import { prisma } from "@/shared/infrastructure/prisma/client";
import type { AIConversationRepository } from "@/modules/search-ai/domain/ports";
import type { AIConversation } from "@/modules/search-ai/domain/types";

export class PrismaAIConversationRepository implements AIConversationRepository {
  async create(userId: string, title: string): Promise<AIConversation> {
    return prisma.aIConversation.create({ data: { userId, title } });
  }

  async findById(id: string): Promise<AIConversation | null> {
    return prisma.aIConversation.findUnique({ where: { id } });
  }

  async listByUser(userId: string): Promise<AIConversation[]> {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async touch(id: string): Promise<void> {
    await prisma.aIConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }
}
