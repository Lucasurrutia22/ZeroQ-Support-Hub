import Link from "next/link";
import { auth } from "@/auth";
import { listProcedures } from "@/modules/knowledge/application/use-cases/procedures";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canCreateProcedure, canApproveProcedure } from "@/modules/knowledge/application/policies";
import type { ProcedureStatus } from "@/modules/knowledge/domain/types";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  RISK_LABELS,
  RISK_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
} from "@/lib/knowledge-ui";

const STATUS_OPTIONS: ProcedureStatus[] = [
  "draft",
  "in_review",
  "approved",
  "deprecated",
];

export default async function ProceduresPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; status?: string; error?: string }>;
}) {
  const { categoryId, status, error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const validStatus = STATUS_OPTIONS.includes(status as ProcedureStatus)
    ? (status as ProcedureStatus)
    : undefined;

  const [procedures, categories] = await Promise.all([
    listProcedures({ categoryId: categoryId || undefined, status: validStatus }),
    listCategories(),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const canCreate = canCreateProcedure(role);
  const canReview = canApproveProcedure(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Procedimientos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Base de conocimiento versionada de ZeroQ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/procedures/categories"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Categorías
          </Link>
          {canReview ? (
            <Link
              href="/procedures/review"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Cola de revisión
            </Link>
          ) : null}
          {canCreate ? (
            <Link
              href="/procedures/new"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Nuevo procedimiento
            </Link>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800"
      >
        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Estado
          <select
            name="status"
            defaultValue={validStatus ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Riesgo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Favoritos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {procedures.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  No hay procedimientos que coincidan con el filtro.
                </td>
              </tr>
            ) : (
              procedures.map((procedure) => (
                <tr key={procedure.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/procedures/${procedure.slug}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {procedure.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {categoryNameById.get(procedure.categoryId) ?? procedure.category.name}
                  </td>
                  <td className="px-4 py-2">
                    <span className={badgeClass(RISK_BADGE_CLASSES[procedure.riskLevel])}>
                      {RISK_LABELS[procedure.riskLevel]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={badgeClass(STATUS_BADGE_CLASSES[procedure.status])}>
                      {STATUS_LABELS[procedure.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {procedure.favoriteCount}
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
