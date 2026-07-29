import Link from "next/link";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { listProcedures } from "@/modules/knowledge/application/use-cases/procedures";

const PARENT_SLUG = "bitacora-totems";

// Bitácora de Tótems: sección propia y clara en la navegación, separada de
// Documentación (Document — archivos subidos, sin versionado) y del listado
// genérico de Procedimientos. Bajo el capó son Procedure normales (versionado,
// indexados por la IA) agrupados por la jerarquía de Category (padre
// "Bitácora de Tótems" + subcategorías por tema) — esta página es solo un
// índice organizado que enlaza al listado ya existente en /procedures,
// filtrado por cada subcategoría, sin duplicar esa pantalla.
export default async function BitacoraPage() {
  const categories = await listCategories();
  const parent = categories.find((category) => category.slug === PARENT_SLUG);

  if (!parent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Bitácora de Tótems</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay contenido cargado en la Bitácora.
        </p>
      </div>
    );
  }

  const subcategories = categories
    .filter((category) => category.parentId === parent.id)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const counts = await Promise.all(
    subcategories.map((category) => listProcedures({ categoryId: category.id })),
  );

  const totalCount = counts.reduce((sum, procedures) => sum + procedures.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bitácora de Tótems</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Procedimientos operativos de soporte técnico (impresión, red, base de datos, hardware y
          más), organizados por tema — {totalCount} procedimientos en {subcategories.length}{" "}
          categorías.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subcategories.map((category, index) => (
          <Link
            key={category.id}
            href={`/procedures?categoryId=${category.id}`}
            className="rounded-md border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-600"
          >
            <p className="font-medium text-slate-900 dark:text-slate-100">{category.name}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {counts[index].length} procedimiento{counts[index].length === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
