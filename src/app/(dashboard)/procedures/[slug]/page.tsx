import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProcedureBySlug } from "@/modules/knowledge/application/use-cases/procedures";
import {
  canApproveProcedure,
  canDeprecateProcedure,
  canEditProcedure,
  canRequestReview,
} from "@/modules/knowledge/application/policies";
import {
  approveProcedureAction,
  deprecateProcedureAction,
  rejectProcedureAction,
  requestReviewAction,
  toggleFavoriteAction,
} from "../actions";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  RISK_LABELS,
  RISK_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
} from "@/lib/knowledge-ui";

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
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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
            <form action={rejectProcedureAction.bind(null, procedure.id, procedure.slug)}>
              <button
                type="submit"
                className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Rechazar
              </button>
            </form>
          </>
        ) : null}

        {procedure.status === "approved" && canDeprecateProcedure(role) ? (
          <form action={deprecateProcedureAction.bind(null, procedure.id, procedure.slug)}>
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Deprecar
            </button>
          </form>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        {procedure.currentVersion ? (
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {procedure.currentVersion.contentMarkdown}
          </pre>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este procedimiento todavía no tiene contenido de versión.
          </p>
        )}
      </div>
    </div>
  );
}
