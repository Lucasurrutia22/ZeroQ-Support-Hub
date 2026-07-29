import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getDocumentDownloadUrl,
  listDocuments,
} from "@/modules/knowledge/application/use-cases/documents";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { recordView } from "@/modules/knowledge/application/use-cases/view-history";
import { DOCUMENT_FILE_TYPE_LABELS } from "@/lib/knowledge-ui";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [documents, categories, downloadUrlResult] = await Promise.all([
    listDocuments({}),
    listCategories(),
    getDocumentDownloadUrl(id),
  ]);

  const document = documents.find((doc) => doc.id === id);
  if (!document || !downloadUrlResult.ok) notFound();

  await recordView(
    { id: session!.user.id, role: session!.user.role },
    "document",
    document.id,
  );

  const category = categories.find((c) => c.id === document.categoryId);
  const supersededBy = documents.find((doc) => doc.supersedesId === document.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {category?.name ?? "Sin categoría"} ·{" "}
          {DOCUMENT_FILE_TYPE_LABELS[document.fileType]} ·{" "}
          {new Date(document.createdAt).toLocaleDateString("es")}
        </p>
      </div>

      {supersededBy ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          Este documento fue reemplazado por una versión más reciente.
        </p>
      ) : null}

      <div>
        <a
          href={downloadUrlResult.value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Descargar
        </a>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          El enlace de descarga es válido por 1 hora.
        </p>
      </div>
    </div>
  );
}
