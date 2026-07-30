import Link from "next/link";
import { auth } from "@/auth";
import { listDocuments } from "@/modules/knowledge/application/use-cases/documents";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canUploadDocument } from "@/modules/knowledge/application/policies";
import { DOCUMENT_FILE_TYPE_LABELS, errorMessageFor } from "@/lib/knowledge-ui";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; bitacoraQueued?: string }>;
}) {
  const { error, bitacoraQueued } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const [documents, categories] = await Promise.all([
    listDocuments({}),
    listCategories(),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const canUpload = canUploadDocument(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documentación</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manuales y material de referencia de terceros.
          </p>
        </div>
        {canUpload ? (
          <Link
            href="/documents/upload"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            Subir documento
          </Link>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {bitacoraQueued ? (
        <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span aria-hidden>✓</span>
          <span>
            Documento subido. Como pertenece a Bitácora de Tótems, la IA ya está generando un
            resumen — en unos segundos vas a verlo en{" "}
            <Link href="/procedures/review" className="font-medium underline">
              Procedimientos en revisión
            </Link>
            .
          </span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No hay documentos subidos todavía.
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {document.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {categoryNameById.get(document.categoryId) ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {DOCUMENT_FILE_TYPE_LABELS[document.fileType]}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {new Date(document.createdAt).toLocaleDateString("es")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
