import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/modules/clients/application/use-cases/clients";
import { listResolvedCases } from "@/modules/cases/application/use-cases/cases";
import {
  CLIENT_TYPE_LABELS,
  ACTIVE_BADGE_CLASSES,
  badgeClass,
  formatDate,
} from "@/lib/support-ui";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await getClientById(id);
  if (!client) notFound();

  const cases = await listResolvedCases({ clientId: id });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <span
              className={badgeClass(
                ACTIVE_BADGE_CLASSES[client.active ? "active" : "inactive"],
              )}
            >
              {client.active ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {CLIENT_TYPE_LABELS[client.type]}
          </p>
        </div>

        <Link
          href={`/clients/${client.id}/assets`}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Infraestructura
        </Link>
      </div>

      {client.contactInfo ? (
        <div className="rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
          <h2 className="mb-2 font-medium">Información de contacto</h2>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 dark:text-slate-300">
            {JSON.stringify(client.contactInfo, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-medium">Casos resueltos</h2>
          <Link
            href={`/cases?clientId=${client.id}`}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {cases.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Este cliente todavía no tiene casos resueltos registrados.
            </li>
          ) : (
            cases.slice(0, 10).map((resolvedCase) => (
              <li key={resolvedCase.id} className="px-4 py-3">
                <Link
                  href={`/cases/${resolvedCase.id}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  {resolvedCase.title}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resolvedCase.categoryName} · {formatDate(resolvedCase.resolvedAt)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
