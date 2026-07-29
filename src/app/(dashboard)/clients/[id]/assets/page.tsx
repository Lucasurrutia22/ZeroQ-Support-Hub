import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getClientById } from "@/modules/clients/application/use-cases/clients";
import { listAssetsByClient } from "@/modules/clients/application/use-cases/assets";
import { canManageInfrastructure } from "@/modules/clients/application/policies";
import type { AssetType } from "@/modules/clients/domain/types";
import { registerAssetAction } from "../../actions";
import { ASSET_TYPE_LABELS, errorMessageFor } from "@/lib/support-ui";

const TYPE_OPTIONS: AssetType[] = [
  "totem",
  "modulo_atencion",
  "pantalla",
  "impresora",
  "servidor",
  "tv_box",
  "otro",
];

export default async function ClientAssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const client = await getClientById(id);
  if (!client) notFound();

  const assets = await listAssetsByClient(id);
  const canRegister = canManageInfrastructure(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link href={`/clients/${client.id}`} className="hover:underline">
            {client.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Infraestructura</h1>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Modelo</th>
              <th className="px-4 py-2 font-medium">Ubicación</th>
              <th className="px-4 py-2 font-medium">Serial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {assets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  Este cliente todavía no tiene activos registrados.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/clients/${client.id}/assets/${asset.id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {ASSET_TYPE_LABELS[asset.type]}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {asset.model ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {asset.location ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {asset.serialNumber ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canRegister ? (
        <div className="max-w-2xl rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-3 font-medium">Registrar activo</h2>
          <form
            action={registerAssetAction.bind(null, client.id)}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              Tipo
              <select
                name="type"
                required
                defaultValue=""
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="" disabled>
                  Selecciona un tipo
                </option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {ASSET_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Modelo (opcional)
              <input
                name="model"
                type="text"
                maxLength={200}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Ubicación (opcional)
              <input
                name="location"
                type="text"
                maxLength={200}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Número de serie (opcional)
              <input
                name="serialNumber"
                type="text"
                maxLength={200}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <button
              type="submit"
              className="mt-2 self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Registrar activo
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
