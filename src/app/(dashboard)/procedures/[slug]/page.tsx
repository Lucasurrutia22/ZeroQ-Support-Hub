import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProcedureBySlug } from "@/modules/knowledge/application/use-cases/procedures";
import { recordView } from "@/modules/knowledge/application/use-cases/view-history";
import { extractCommandAnnotations } from "@/modules/knowledge/application/command-annotations";
import {
  canApproveProcedure,
  canDeprecateProcedure,
  canEditProcedure,
  canRequestReview,
} from "@/modules/knowledge/application/policies";
import {
  approveProcedureAction,
  requestReviewAction,
  toggleFavoriteAction,
} from "../actions";
import { RejectProcedureButton } from "../RejectProcedureButton";
import { DeprecateProcedureButton } from "../DeprecateProcedureButton";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  RISK_LABELS,
  RISK_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
} from "@/lib/knowledge-ui";
import { MarkdownContent } from "@/components/shared/MarkdownContent";

export default async function ProcedureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const procedure = await getProcedureBySlug(slug);
  if (!procedure) notFound();

  await recordView({ id: session!.user.id, role }, "procedure", procedure.id);

  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{procedure.title}</h1>
            <span className={badgeClass(STATUS_BADGE_CLASSES[procedure.status])}>
              {STATUS_LABELS[procedure.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {procedure.category.name}
            {procedure.estimatedTimeMinutes
              ? ` · ~${procedure.estimatedTimeMinutes} min`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/procedures/${procedure.slug}/versions`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Historial de versiones
          </Link>
          {canEditProcedure(role) ? (
            <Link
              href={`/procedures/${procedure.slug}/edit`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={badgeClass(RISK_BADGE_CLASSES[procedure.riskLevel])}>
          Riesgo {RISK_LABELS[procedure.riskLevel]}
        </span>
        {procedure.tags.map((tag) => (
          <span
            key={tag.id}
            className={badgeClass(
              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            #{tag.name}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={toggleFavoriteAction.bind(null, procedure.id, procedure.slug)}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Marcar como favorito ({procedure.favoriteCount})
          </button>
        </form>

        {procedure.status === "draft" && canRequestReview(role) ? (
          <form action={requestReviewAction.bind(null, procedure.id, procedure.slug)}>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              Solicitar revisión
            </button>
          </form>
        ) : null}

        {procedure.status === "in_review" && canApproveProcedure(role) ? (
          <>
            <form action={approveProcedureAction.bind(null, procedure.id, procedure.slug)}>
              <button
                type="submit"
                className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Aprobar
              </button>
            </form>
            <RejectProcedureButton
              procedureId={procedure.id}
              slug={procedure.slug}
              title={procedure.title}
            />
          </>
        ) : null}

        {procedure.status === "approved" && canDeprecateProcedure(role) ? (
          <DeprecateProcedureButton
            procedureId={procedure.id}
            slug={procedure.slug}
            title={procedure.title}
          />
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        {procedure.currentVersion ? (
          <MarkdownContent content={procedure.currentVersion.contentMarkdown} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este procedimiento todavía no tiene contenido de versión.
          </p>
        )}
      </div>

      {procedure.currentVersion ? (
        <CommandGuide markdown={procedure.currentVersion.contentMarkdown} />
      ) : null}
    </div>
  );
}

// Pedido del usuario: "necesito que sea más claro en dónde ejecutar cada
// comando, basate como si fueras un agente experto en Linux". Detecta los
// comandos reales del contenido y los anota con dónde correrlos (host,
// contenedor Docker, consola de psql/redis-cli, PowerShell) y qué hacen —
// ver command-annotations.ts para las reglas. Solo se muestra si el
// contenido tiene al menos un comando detectado.
function CommandGuide({ markdown }: { markdown: string }) {
  const annotations = extractCommandAnnotations(markdown);
  if (annotations.length === 0) return null;

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Dónde ejecutar cada comando</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Generado automáticamente a partir del contenido de este procedimiento — verificá siempre
          contra el paso a paso de arriba antes de ejecutar.
        </p>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {annotations.map((annotation, index) => (
          <li key={`${annotation.command}-${index}`} className="flex flex-col gap-1 px-4 py-3">
            <code className="w-fit rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-900">
              {annotation.command}
            </code>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              📍 {annotation.context}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{annotation.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
