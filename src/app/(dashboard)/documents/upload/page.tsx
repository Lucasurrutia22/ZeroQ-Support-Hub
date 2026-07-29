import { auth } from "@/auth";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canUploadDocument } from "@/modules/knowledge/application/policies";
import { uploadDocumentAction } from "../actions";
import { DOCUMENT_FILE_TYPE_LABELS, errorMessageFor } from "@/lib/knowledge-ui";
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
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Subir documento</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          No tienes permiso para esta acción.
        </p>
      </div>
    );
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select
            name="categoryId"
            required
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Subir documento
        </button>
      </form>
    </div>
  );
}
