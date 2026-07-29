import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Document } from "../../domain/types";
import type {
  CreateDocumentInput,
  DocumentListFilter,
  DocumentRepository,
} from "../../domain/ports";

export class PrismaDocumentRepository implements DocumentRepository {
  async create(input: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        title: input.title,
        categoryId: input.categoryId,
        fileType: input.fileType,
        storageKey: input.storageKey,
        uploadedBy: input.uploadedBy,
        supersedesId: input.supersedesId ?? null,
      },
    });
  }

  async findById(id: string): Promise<Document | null> {
    return prisma.document.findUnique({ where: { id } });
  }

  async list(filter: DocumentListFilter): Promise<Document[]> {
    return prisma.document.findMany({
      where: {
        categoryId: filter.categoryId,
        // Solo la versión vigente: un documento reemplazado no debe listarse.
        supersededBy: { is: null },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
