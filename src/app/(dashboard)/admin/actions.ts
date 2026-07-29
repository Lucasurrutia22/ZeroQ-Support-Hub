"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { createUserSchema } from "@/lib/schemas/identity";
import {
  createUser,
  setUserActive,
  setUserRole,
} from "@/modules/identity/application/use-cases/users";
import type { Role } from "@/modules/identity/domain/role";

function errorRedirect(basePath: string, code: string): never {
  redirect(`${basePath}?error=${encodeURIComponent(code)}`);
}

export async function createUserAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof createUserSchema.parse>;
  try {
    input = createUserSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });
  } catch (error) {
    if (error instanceof ZodError) errorRedirect("/admin/new", "invalid_input");
    throw error;
  }

  const result = await createUser(actingUser, input);
  if (!result.ok) errorRedirect("/admin/new", result.error.code);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const actingUser = await getActingUserOrThrow();
  const result = await setUserActive(actingUser, userId, active);
  if (!result.ok) errorRedirect("/admin", result.error.code);
  revalidatePath("/admin");
}

export async function setUserRoleAction(userId: string, formData: FormData) {
  const actingUser = await getActingUserOrThrow();
  const role = formData.get("role") as Role;
  const result = await setUserRole(actingUser, userId, role);
  if (!result.ok) errorRedirect("/admin", result.error.code);
  revalidatePath("/admin");
}
