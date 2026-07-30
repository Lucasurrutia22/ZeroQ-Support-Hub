import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canUploadDocument } from "@/modules/knowledge/application/policies";
import { uploadDocumentAction } from "../actions";
import { DOCUMENT_FILE_TYPE_LABELS, errorMessageFor } from "@/lib/knowledge-ui";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";
import type { DocumentFileType } from "@/modules/knowledge/domain/types";

const FILE_TYPE_OPTIONS: DocumentFileType[] = [
  "manual",
  "datasheet",
  "firmware_notes",
  "otro",
];

export default async function UploadDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; supersedesId?: string }>;
}) {
  const { error, supersedesId } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  if (!canUploadDocument(role)) {
    redirect("/documents");
  }

  const categories = await listCategories();
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Subir documento</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manuales de fabricante, datasheets o notas de firmware. Sin flujo de
          revisión: la re-subida reemplaza al anterior.
        </p>
      </div>

      <p className="max-w-2xl rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        <span aria-hidden>💡</span> Si elegís una categoría de{" "}
        <span className="font-medium">Bitácora de Tótems</span> y el archivo es{" "}
        <span className="font-medium">.txt, .md, .pdf o .docx</span>, el sistema lo lee y genera
        automáticamente una entrada resumida por IA en Bitácora — queda en{" "}
        <span className="font-medium">revisión</span> hasta que un supervisor la apruebe, momento
        en el que también se suma al conocimiento del Asistente de IA. Otros formatos (imágenes,
        planillas, etc.) se suben igual, solo no generan esta entrada automática.
      </p>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form
        action={uploadDocumentAction}
        className="flex max-w-2xl flex-col gap-4"
      >
        {supersedesId ? (
          <input type="hidden" name="supersedesId" value={supersedesId} />
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={200}
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select
            name="categoryId"
            required
            defaultValue=""
            className={FORM_INPUT_CLASSES}
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo de archivo
          <select
            name="fileType"
            required
            defaultValue="manual"
            className={FORM_INPUT_CLASSES}
          >
            {FILE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DOCUMENT_FILE_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Archivo
          <input
            name="file"
            type="file"
            required
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Subir documento
        </button>
      </form>
    </div>
  );
}
