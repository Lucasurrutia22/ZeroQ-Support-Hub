"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import {
  addProcedureVersionSchema,
  createProcedureSchema,
} from "@/lib/schemas/knowledge";
import {
  approveProcedure,
  createProcedure,
  deprecateProcedure,
  editProcedureContent,
  rejectProcedure,
  requestReview,
} from "@/modules/knowledge/application/use-cases/procedures";
import { toggleFavorite } from "@/modules/knowledge/application/use-cases/favorites";

function errorRedirect(basePath: string, code: string): never {
  redirect(`${basePath}?error=${encodeURIComponent(code)}`);
}

export async function createProcedureAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof createProcedureSchema.parse>;
  try {
    input = createProcedureSchema.parse({
      title: formData.get("title"),
      categoryId: formData.get("categoryId"),
      riskLevel: formData.get("riskLevel"),
      estimatedTimeMinutes: formData.get("estimatedTimeMinutes") || undefined,
      contentMarkdown: formData.get("contentMarkdown"),
      tagNames: formData.get("tagNames") || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) errorRedirect("/procedures/new", "invalid_input");
    throw error;
  }

  const result = await createProcedure(actingUser, input);
  if (!result.ok) errorRedirect("/procedures/new", result.error.code);

  revalidatePath("/procedures");
  redirect(`/procedures/${result.value.slug}`);
}

export async function editProcedureContentAction(
  procedureId: string,
  slug: string,
  formData: FormData,
) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof addProcedureVersionSchema.parse>;
  try {
    input = addProcedureVersionSchema.parse({
      contentMarkdown: formData.get("contentMarkdown"),
      changeSummary: formData.get("changeSummary") || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) errorRedirect(`/procedures/${slug}/edit`, "invalid_input");
    throw error;
  }

  const result = await editProcedureContent(actingUser, {
    procedureId,
    ...input,
  });
  if (!result.ok) errorRedirect(`/procedures/${slug}/edit`, result.error.code);

  revalidatePath(`/procedures/${slug}`);
  redirect(`/procedures/${slug}`);
}

export async function requestReviewAction(procedureId: string, slug: string) {
  const actingUser = await getActingUserOrThrow();
  const result = await requestReview(actingUser, procedureId);
  if (!result.ok) errorRedirect(`/procedures/${slug}`, result.error.code);
  revalidatePath(`/procedures/${slug}`);
}

export async function approveProcedureAction(procedureId: string, slug: string) {
  const actingUser = await getActingUserOrThrow();
  const result = await approveProcedure(actingUser, procedureId);
  if (!result.ok) errorRedirect(`/procedures/${slug}`, result.error.code);
  revalidatePath(`/procedures/${slug}`);
  revalidatePath("/procedures/review");
}

export async function rejectProcedureAction(procedureId: string, slug: string) {
  const actingUser = await getActingUserOrThrow();
  const result = await rejectProcedure(actingUser, procedureId);
  if (!result.ok) errorRedirect(`/procedures/${slug}`, result.error.code);
  revalidatePath(`/procedures/${slug}`);
  revalidatePath("/procedures/review");
}

export async function deprecateProcedureAction(procedureId: string, slug: string) {
  const actingUser = await getActingUserOrThrow();
  const result = await deprecateProcedure(actingUser, procedureId);
  if (!result.ok) errorRedirect(`/procedures/${slug}`, result.error.code);
  revalidatePath(`/procedures/${slug}`);
}

export async function toggleFavoriteAction(procedureId: string, slug: string) {
  const actingUser = await getActingUserOrThrow();
  const result = await toggleFavorite(actingUser, procedureId);
  if (!result.ok) errorRedirect(`/procedures/${slug}`, result.error.code);
  revalidatePath(`/procedures/${slug}`);
  revalidatePath("/favorites");
}
