"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import {
  createResolvedCaseSchema,
  uploadAttachmentMetadataSchema,
} from "@/lib/schemas/support";
import {
  createResolvedCase,
  linkProcedureToCase,
} from "@/modules/cases/application/use-cases/cases";
import { uploadCaseAttachment } from "@/modules/cases/application/use-cases/attachments";

export async function createResolvedCaseAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof createResolvedCaseSchema.parse>;
  try {
    input = createResolvedCaseSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
      clientId: formData.get("clientId") || undefined,
      infrastructureAssetId: formData.get("infrastructureAssetId") || undefined,
      symptoms: formData.get("symptoms"),
      rootCause: formData.get("rootCause"),
      solution: formData.get("solution"),
      timeSpentMinutes: formData.get("timeSpentMinutes") || undefined,
      relatedProcedureIds: formData.get("relatedProcedureIds") || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) redirect("/cases/new?error=invalid_input");
    throw error;
  }

  const result = await createResolvedCase(actingUser, input);
  if (!result.ok) {
    redirect(`/cases/new?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath("/cases");
  redirect(`/cases/${result.value.id}`);
}

export async function linkProcedureToCaseAction(
  caseId: string,
  formData: FormData,
) {
  const actingUser = await getActingUserOrThrow();
  const procedureId = formData.get("procedureId");

  if (typeof procedureId !== "string" || !procedureId) {
    redirect(`/cases/${caseId}?error=invalid_input`);
  }

  const result = await linkProcedureToCase(actingUser, caseId, procedureId);
  if (!result.ok) {
    redirect(`/cases/${caseId}?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath(`/cases/${caseId}`);
}

export async function uploadCaseAttachmentAction(
  caseId: string,
  formData: FormData,
) {
  const actingUser = await getActingUserOrThrow();

  let metadata: ReturnType<typeof uploadAttachmentMetadataSchema.parse>;
  try {
    metadata = uploadAttachmentMetadataSchema.parse({
      fileType: formData.get("fileType"),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/cases/${caseId}?error=invalid_input`);
    }
    throw error;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/cases/${caseId}?error=missing_file`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadCaseAttachment(actingUser, {
    caseId,
    fileType: metadata.fileType,
    fileName: file.name,
    fileBuffer: buffer,
    contentType: file.type || "application/octet-stream",
  });

  if (!result.ok) {
    redirect(`/cases/${caseId}?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath(`/cases/${caseId}`);
}
