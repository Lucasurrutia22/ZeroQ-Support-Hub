import { auth } from "@/auth";
import { canCreateCase } from "@/modules/cases/application/policies";
import { createResolvedCaseAction } from "../actions";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { listClients } from "@/modules/clients/application/use-cases/clients";
import { listAssetsByClient } from "@/modules/clients/application/use-cases/assets";
import { listProcedures } from "@/modules/knowledge/application/use-cases/procedures";
import { ASSET_TYPE_LABELS, errorMessageFor } from "@/lib/support-ui";
import { RelatedProceduresPicker } from "./RelatedProceduresPicker";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  if (!canCreateCase(role)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Nuevo caso</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          No tienes permiso para esta acción.
        </p>
      </div>
    );
  }

  const [categories, clients, procedures] = await Promise.all([
    listCategories(),
    listClients({}),
    listProcedures({}),
  ]);

  const assetsByClient = await Promise.all(
    clients.map((client) => listAssetsByClient(client.id)),
  );
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));
  const assets = assetsByClient.flat();

  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo caso resuelto</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Queda disponible de inmediato — sin flujo de aprobación.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form
        action={createResolvedCaseAction}
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
          Descripción
          <textarea
            name="description"
            required
            rows={4}
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
          Cliente (opcional)
          <select
            name="clientId"
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Sin cliente asociado</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Activo de infraestructura (opcional)
          <select
            name="infrastructureAssetId"
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Sin activo asociado</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {clientNameById.get(asset.clientId) ?? "Cliente"} — {ASSET_TYPE_LABELS[asset.type]}
                {asset.model ? ` (${asset.model})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Síntomas
          <textarea
            name="symptoms"
            required
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Causa raíz
          <textarea
            name="rootCause"
            required
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Solución
          <textarea
            name="solution"
            required
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tiempo invertido (minutos, opcional)
          <input
            name="timeSpentMinutes"
            type="number"
            min={1}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          Procedimientos relacionados (opcional)
          <RelatedProceduresPicker
            procedures={procedures.map((procedure) => ({
              id: procedure.id,
              title: procedure.title,
            }))}
          />
        </div>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Guardar caso
        </button>
      </form>
    </div>
  );
}
