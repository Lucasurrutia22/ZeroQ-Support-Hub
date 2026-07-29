"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { createCategorySchema } from "@/lib/schemas/knowledge";
import { createCategory } from "@/modules/knowledge/application/use-cases/categories";

export async function createCategoryAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof createCategorySchema.parse>;
  try {
    input = createCategorySchema.parse({
      name: formData.get("name"),
      parentId: formData.get("parentId") || undefined,
      description: formData.get("description") || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      redirect("/procedures/categories?error=invalid_input");
    }
    throw error;
  }

  const result = await createCategory(actingUser, input);
  if (!result.ok) {
    redirect(`/procedures/categories?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath("/procedures/categories");
  redirect("/procedures/categories");
}
