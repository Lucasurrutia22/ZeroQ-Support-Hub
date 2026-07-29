import Link from "next/link";
import { auth } from "@/auth";
import { listClients } from "@/modules/clients/application/use-cases/clients";
import { canManageClients } from "@/modules/clients/application/policies";
import type { ClientType } from "@/modules/clients/domain/types";
import {
  CLIENT_TYPE_LABELS,
  ACTIVE_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
} from "@/lib/support-ui";

const TYPE_OPTIONS: ClientType[] = [
  "banco",
  "hospital",
  "municipalidad",
  "retail",
  "gobierno",
  "otro",
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  const { type, error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const validType = TYPE_OPTIONS.includes(type as ClientType)
    ? (type as ClientType)
    : undefined;

  const clients = await listClients({ type: validType });
  const canCreate = canManageClients(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Clientes de ZeroQ y su infraestructura asociada.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/clients/new"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Nuevo cliente
          </Link>
        ) : null}
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
          Tipo
          <select
            name="type"
            defaultValue={validType ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todos</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CLIENT_TYPE_LABELS[option]}
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
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  No hay clientes que coincidan con el filtro.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {CLIENT_TYPE_LABELS[client.type]}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={badgeClass(
                        ACTIVE_BADGE_CLASSES[client.active ? "active" : "inactive"],
                      )}
                    >
                      {client.active ? "Activo" : "Inactivo"}
                    </span>
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
