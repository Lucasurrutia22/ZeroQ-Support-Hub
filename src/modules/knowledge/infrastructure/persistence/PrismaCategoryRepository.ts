import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Category } from "../../domain/types";
import type { CategoryRepository, CreateCategoryInput } from "../../domain/ports";

export class PrismaCategoryRepository implements CategoryRepository {
  async findAll(): Promise<Category[]> {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } });
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    return prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
        description: input.description ?? null,
      },
    });
  }

  async update(
    id: string,
    input: Partial<CreateCategoryInput>,
  ): Promise<Category> {
    return prisma.category.update({ where: { id }, data: input });
  }
}
