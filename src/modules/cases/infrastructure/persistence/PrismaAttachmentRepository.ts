import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Attachment } from "../../domain/types";
import type {
  AttachmentRepository,
  CreateAttachmentInput,
} from "../../domain/ports";

export class PrismaAttachmentRepository implements AttachmentRepository {
  async create(input: CreateAttachmentInput): Promise<Attachment> {
    // Solo el lado `caseId` del polimorfismo se usa en este módulo — ver
    // nota en prisma/schema.prisma. `procedureId` queda null a propósito.
    return prisma.attachment.create({
      data: {
        caseId: input.caseId,
        fileType: input.fileType,
        storageKey: input.storageKey,
        uploadedBy: input.uploadedBy,
      },
    });
  }

  async findById(id: string): Promise<Attachment | null> {
    return prisma.attachment.findUnique({ where: { id } });
  }

  async listByCase(caseId: string): Promise<Attachment[]> {
    return prisma.attachment.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  }
}
