import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProcedures } from "@/modules/knowledge/application/use-cases/procedures";
import { canApproveProcedure } from "@/modules/knowledge/application/policies";
import { approveProcedureAction } from "../actions";
import { RejectProcedureButton } from "../RejectProcedureButton";
import { RISK_LABELS, RISK_BADGE_CLASSES, badgeClass, errorMessageFor } from "@/lib/knowledge-ui";

export default async function ProcedureReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  if (!canApproveProcedure(role)) {
    redirect("/procedures");
  }

  const procedures = await listProcedures({ status: "in_review" });
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cola de revisión</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Procedimientos en espera de aprobación.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {procedures.map((procedure) => (
          <li
            key={procedure.id}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-800"
          >
            <div>
              <Link
                href={`/procedures/${procedure.slug}`}
                className="font-medium hover:underline"
              >
                {procedure.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {procedure.category.name}
              </p>
              <span className={badgeClass(RISK_BADGE_CLASSES[procedure.riskLevel])}>
                Riesgo {RISK_LABELS[procedure.riskLevel]}
              </span>
            </div>

            <div className="flex shrink-0 gap-2">
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
            </div>
          </li>
        ))}

        {procedures.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            No hay procedimientos en revisión.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
