"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { uploadDocumentMetadataSchema } from "@/lib/schemas/knowledge";
import { uploadDocument } from "@/modules/knowledge/application/use-cases/documents";
import { isBitacoraCategory } from "@/modules/knowledge/application/use-cases/bitacora-auto-ingest";
import { isExtractableFormat } from "@/modules/knowledge/application/document-text-extraction";

export async function uploadDocumentAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let metadata: ReturnType<typeof uploadDocumentMetadataSchema.parse>;
  try {
    metadata = uploadDocumentMetadataSchema.parse({
      title: formData.get("title"),
      categoryId: formData.get("categoryId"),
      fileType: formData.get("fileType"),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      redirect("/documents/upload?error=invalid_input");
    }
    throw error;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/documents/upload?error=missing_file");
  }

  const supersedesId = formData.get("supersedesId");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadDocument(actingUser, {
    ...metadata,
    fileName: file.name,
    fileBuffer: buffer,
    contentType: file.type || "application/octet-stream",
    supersedesId: typeof supersedesId === "string" ? supersedesId : undefined,
  });

  if (!result.ok) {
    redirect(`/documents/upload?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath("/documents");

  // El aviso "se está generando un resumen" solo debe prometerse si de
  // verdad va a intentarse: categoría de Bitácora Y formato con extractor
  // real (ver document-text-extraction.ts). Antes esto solo chequeaba la
  // categoría, así que un .docx sin soportar (o cualquier formato futuro
  // sin extractor) mostraba el aviso igual aunque la ingesta se descartara
  // en silencio — confuso, el usuario esperaba verlo en revisión y nunca
  // aparecía.
  const bitacoraEligible =
    (await isBitacoraCategory(metadata.categoryId)) && isExtractableFormat(file.name);
  if (bitacoraEligible) {
    // La generación del Procedure ocurre en segundo plano (ver
    // ingestDocumentAsBitacoraEntry) — se revalidan estas rutas igual porque
    // el próximo request a /bitacora o /procedures/review normalmente ya la
    // encuentra lista (extracción + resumen suelen tardar segundos, no
    // minutos, salvo PDFs muy grandes).
    revalidatePath("/bitacora");
    revalidatePath("/procedures/review");
    redirect("/documents?bitacoraQueued=1");
  }

  redirect("/documents");
}
