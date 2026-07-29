import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProcedureBySlug,
  listProcedureVersions,
} from "@/modules/knowledge/application/use-cases/procedures";

export default async function ProcedureVersionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const procedure = await getProcedureBySlug(slug);
  if (!procedure) notFound();

  const versions = await listProcedureVersions(procedure.id);
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Historial de versiones: {procedure.title}
        </h1>
        <Link
          href={`/procedures/${procedure.slug}`}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          Volver al procedimiento
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((version) => (
          <li
            key={version.id}
            className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Versión {version.versionNumber}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(version.createdAt).toLocaleString("es")}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {version.changeSummary ?? "Sin resumen de cambios."}
            </p>
          </li>
        ))}
        {sorted.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            Este procedimiento todavía no tiene versiones registradas.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
