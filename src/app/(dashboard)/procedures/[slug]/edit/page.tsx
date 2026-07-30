import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProcedureBySlug } from "@/modules/knowledge/application/use-cases/procedures";
import { canEditProcedure } from "@/modules/knowledge/application/policies";
import { editProcedureContentAction } from "../../actions";
import { errorMessageFor } from "@/lib/knowledge-ui";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";
import { ProcedureContentEditor } from "../../ProcedureContentEditor";

export default async function EditProcedurePage({
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

  if (!canEditProcedure(role)) {
    redirect(`/procedures/${procedure.slug}`);
  }

  const editAction = editProcedureContentAction.bind(
    null,
    procedure.id,
    procedure.slug,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar: {procedure.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Guardar crea una nueva versión del procedimiento.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form action={editAction} className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          Contenido (Markdown)
          <ProcedureContentEditor
            name="contentMarkdown"
            rows={16}
            defaultValue={procedure.currentVersion?.contentMarkdown ?? ""}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Resumen del cambio (opcional)
          <input
            name="changeSummary"
            type="text"
            maxLength={500}
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Guardar nueva versión
        </button>
      </form>
    </div>
  );
}
