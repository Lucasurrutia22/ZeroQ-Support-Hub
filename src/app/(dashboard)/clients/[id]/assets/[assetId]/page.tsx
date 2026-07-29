import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/modules/clients/application/use-cases/clients";
import { getAssetById } from "@/modules/clients/application/use-cases/assets";
import { listResolvedCases } from "@/modules/cases/application/use-cases/cases";
import { ASSET_TYPE_LABELS, formatDate } from "@/lib/support-ui";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const { id, assetId } = await params;

  const asset = await getAssetById(assetId);
  if (!asset || asset.clientId !== id) notFound();

  const client = await getClientById(id);
  if (!client) notFound();

  const cases = await listResolvedCases({ infrastructureAssetId: asset.id });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link href={`/clients/${client.id}`} className="hover:underline">
            {client.name}
          </Link>
          {" · "}
          <Link href={`/clients/${client.id}/assets`} className="hover:underline">
            Infraestructura
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">{ASSET_TYPE_LABELS[asset.type]}</h1>
      </div>

      <div className="grid max-w-2xl grid-cols-2 gap-4 rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Modelo</p>
          <p>{asset.model ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Ubicación</p>
          <p>{asset.location ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Número de serie</p>
          <p>{asset.serialNumber ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Registrado</p>
          <p>{formatDate(asset.createdAt)}</p>
        </div>
      </div>

      {asset.metadata ? (
        <div className="max-w-2xl rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
          <h2 className="mb-2 font-medium">Metadata</h2>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 dark:text-slate-300">
            {JSON.stringify(asset.metadata, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-medium">Casos relacionados</h2>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {cases.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Este activo todavía no tiene casos resueltos registrados.
            </li>
          ) : (
            cases.map((resolvedCase) => (
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
