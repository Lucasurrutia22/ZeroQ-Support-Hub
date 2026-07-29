import { prisma } from "@/shared/infrastructure/prisma/client";
import type { Tag } from "../../domain/types";
import type { TagRepository } from "../../domain/ports";

export class PrismaTagRepository implements TagRepository {
  async findAll(): Promise<Tag[]> {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
  }

  async findOrCreateByNames(names: string[]): Promise<Tag[]> {
    const normalized = Array.from(
      new Set(
        names
          .map((name) => name.trim().toLowerCase())
          .filter((name) => name.length > 0),
      ),
    );

    const tags: Tag[] = [];
    for (const name of normalized) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      tags.push(tag);
    }
    return tags;
  }
}
