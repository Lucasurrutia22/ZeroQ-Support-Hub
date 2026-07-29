import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { slugify } from "@/lib/slugify";
import { categoryRepository } from "../../infrastructure/container";
import type { Category } from "../../domain/types";
import { canManageCategories } from "../policies";

export interface CreateCategoryCommand {
  name: string;
  parentId?: string;
  description?: string;
}

export async function createCategory(
  actingUser: ActingUser,
  command: CreateCategoryCommand,
): Promise<Result<Category>> {
  if (!canManageCategories(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Solo un administrador puede gestionar categorías.",
      ),
    );
  }

  if (command.parentId) {
    const parent = await categoryRepository.findById(command.parentId);
    if (!parent) {
      return err(
        new DomainError("parent_not_found", "La categoría padre no existe."),
      );
    }
  }

  const category = await categoryRepository.create({
    name: command.name,
    slug: slugify(command.name),
    parentId: command.parentId ?? null,
    description: command.description ?? null,
  });

  return ok(category);
}

export async function listCategories(): Promise<Category[]> {
  return categoryRepository.findAll();
}
