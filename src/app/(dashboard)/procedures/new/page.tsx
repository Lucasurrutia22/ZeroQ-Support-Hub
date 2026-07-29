import { auth } from "@/auth";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canCreateProcedure } from "@/modules/knowledge/application/policies";
import { createProcedureAction } from "../actions";
import { RISK_LABELS, errorMessageFor } from "@/lib/knowledge-ui";
import type { RiskLevel } from "@/modules/knowledge/domain/types";

const RISK_OPTIONS: RiskLevel[] = ["low", "medium", "high"];

export default async function NewProcedurePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  if (!canCreateProcedure(role)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Nuevo procedimiento</h1>
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
        <h1 className="text-2xl font-semibold">Nuevo procedimiento</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Se crea en estado borrador — luego se puede solicitar revisión.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form
        action={createProcedureAction}
        className="flex max-w-2xl flex-col gap-4"
      >
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
          Nivel de riesgo
          <select
            name="riskLevel"
            required
            defaultValue="low"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {RISK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {RISK_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tiempo estimado (minutos, opcional)
          <input
            name="estimatedTimeMinutes"
            type="number"
            min={1}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contenido (Markdown)
          <textarea
            name="contentMarkdown"
            required
            rows={14}
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tags (separados por coma, opcional)
          <input
            name="tagNames"
            type="text"
            placeholder="impresora, totem, red"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Crear procedimiento
        </button>
      </form>
    </div>
  );
}
