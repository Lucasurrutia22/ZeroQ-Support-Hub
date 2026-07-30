import Link from "next/link";
import { auth } from "@/auth";
import { listProceduresPaged } from "@/modules/knowledge/application/use-cases/procedures";
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
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";

const STATUS_OPTIONS: ProcedureStatus[] = [
  "draft",
  "in_review",
  "approved",
  "deprecated",
];

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function ProceduresPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoryId?: string;
    status?: string;
    q?: string;
    page?: string;
    error?: string;
  }>;
}) {
  const { categoryId, status, q, page, error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const validStatus = STATUS_OPTIONS.includes(status as ProcedureStatus)
    ? (status as ProcedureStatus)
    : undefined;
  const search = q?.trim() || undefined;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const [{ items: procedures, total }, categories] = await Promise.all([
    listProceduresPaged(
      { categoryId: categoryId || undefined, status: validStatus, search },
      currentPage,
    ),
    listCategories(),
  ]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(categoryId || validStatus || search);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const canCreate = canCreateProcedure(role);
  const canReview = canApproveProcedure(role);
  const errorMessage = errorMessageFor(error);

  const baseQueryForPage = { categoryId, status: validStatus, q: search };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Procedimientos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Base de conocimiento versionada de ZeroQ — {total} procedimiento{total === 1 ? "" : "s"}.
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
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
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
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
          Buscar por título
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="ej: redis, impresora, kernel…"
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className={FORM_INPUT_CLASSES}
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
            className={FORM_INPUT_CLASSES}
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
        {hasFilters ? (
          <Link
            href="/procedures"
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            Limpiar filtros
          </Link>
        ) : null}
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
                  {hasFilters ? (
                    <>
                      Ningún procedimiento coincide con estos filtros.{" "}
                      <Link href="/procedures" className="text-blue-600 hover:underline dark:text-blue-400">
                        Limpiar filtros
                      </Link>
                      .
                    </>
                  ) : (
                    "Todavía no hay procedimientos cargados."
                  )}
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/procedures${buildQuery({ ...baseQueryForPage, page: String(currentPage - 1) })}`}
              aria-disabled={currentPage <= 1}
              className={`rounded-md border border-slate-300 px-3 py-1.5 font-medium dark:border-slate-700 ${
                currentPage <= 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              Anterior
            </Link>
            <Link
              href={`/procedures${buildQuery({ ...baseQueryForPage, page: String(currentPage + 1) })}`}
              aria-disabled={currentPage >= totalPages}
              className={`rounded-md border border-slate-300 px-3 py-1.5 font-medium dark:border-slate-700 ${
                currentPage >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              Siguiente
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
