import Link from "next/link";
import { auth } from "@/auth";
import { listResolvedCases } from "@/modules/cases/application/use-cases/cases";
import { listClients } from "@/modules/clients/application/use-cases/clients";
import { canCreateCase } from "@/modules/cases/application/policies";
import { errorMessageFor, formatDate, formatMinutes } from "@/lib/support-ui";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string }>;
}) {
  const { clientId, error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const [cases, clients] = await Promise.all([
    listResolvedCases({ clientId: clientId || undefined }),
    listClients({}),
  ]);

  const canCreate = canCreateCase(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Casos Resueltos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Incidencias documentadas después de resueltas.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/cases/new"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Nuevo caso
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
          Cliente
          <select
            name="clientId"
            defaultValue={clientId ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
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
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Resuelto</th>
              <th className="px-4 py-2 font-medium">Tiempo invertido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {cases.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  No hay casos que coincidan con el filtro.
                </td>
              </tr>
            ) : (
              cases.map((resolvedCase) => (
                <tr key={resolvedCase.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/cases/${resolvedCase.id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {resolvedCase.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {resolvedCase.clientName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {resolvedCase.categoryName}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {formatDate(resolvedCase.resolvedAt)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {formatMinutes(resolvedCase.timeSpentMinutes)}
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
