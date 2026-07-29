import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getResolvedCaseById } from "@/modules/cases/application/use-cases/cases";
import {
  getAttachmentDownloadUrl,
  listCaseAttachments,
} from "@/modules/cases/application/use-cases/attachments";
import { canEditCase, canUploadAttachment } from "@/modules/cases/application/policies";
import { listProcedures } from "@/modules/knowledge/application/use-cases/procedures";
import { getClientById } from "@/modules/clients/application/use-cases/clients";
import { getAssetById } from "@/modules/clients/application/use-cases/assets";
import { linkProcedureToCaseAction, uploadCaseAttachmentAction } from "../actions";
import {
  ASSET_TYPE_LABELS,
  ATTACHMENT_FILE_TYPE_LABELS,
  errorMessageFor,
  formatDate,
  formatMinutes,
} from "@/lib/support-ui";
import type { AttachmentFileType } from "@/modules/cases/domain/types";

const ATTACHMENT_TYPE_OPTIONS: AttachmentFileType[] = [
  "image",
  "video",
  "pdf",
  "config",
  "log",
];

// Server Action inline: no se puede resolver la signed URL en el render
// porque llama a Supabase con efecto (ver encargo). Vive en este mismo
// archivo, exportada, con "use server" a nivel de función.
export async function downloadCaseAttachmentAction(
  caseId: string,
  attachmentId: string,
) {
  "use server";
  const result = await getAttachmentDownloadUrl(attachmentId);
  if (!result.ok) {
    redirect(`/cases/${caseId}?error=${encodeURIComponent(result.error.code)}`);
  }
  redirect(result.value);
}

export default async function CaseDetailPage({
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

  const resolvedCase = await getResolvedCaseById(id);
  if (!resolvedCase) notFound();

  const [attachments, procedures, client, asset] = await Promise.all([
    listCaseAttachments(id),
    listProcedures({}),
    resolvedCase.clientId ? getClientById(resolvedCase.clientId) : null,
    resolvedCase.infrastructureAssetId
      ? getAssetById(resolvedCase.infrastructureAssetId)
      : null,
  ]);

  const procedureById = new Map(procedures.map((procedure) => [procedure.id, procedure]));
  const linkedProcedures = resolvedCase.relatedProcedureIds
    .map((procedureId) => procedureById.get(procedureId))
    .filter((procedure): procedure is NonNullable<typeof procedure> => Boolean(procedure));
  const linkableProcedures = procedures.filter(
    (procedure) => !resolvedCase.relatedProcedureIds.includes(procedure.id),
  );

  const canEdit = canEditCase(role);
  const canUpload = canUploadAttachment(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{resolvedCase.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {resolvedCase.categoryName} · Resuelto el {formatDate(resolvedCase.resolvedAt)} ·{" "}
          {formatMinutes(resolvedCase.timeSpentMinutes)}
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        {client ? (
          <Link
            href={`/clients/${client.id}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cliente: {client.name}
          </Link>
        ) : null}
        {asset ? (
          <Link
            href={`/clients/${asset.clientId}/assets/${asset.id}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Activo: {ASSET_TYPE_LABELS[asset.type]}
          </Link>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="mb-1 font-medium">Descripción</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {resolvedCase.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-1 font-medium">Síntomas</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {resolvedCase.symptoms}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-1 font-medium">Causa raíz</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {resolvedCase.rootCause}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="mb-1 font-medium">Solución</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {resolvedCase.solution}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-medium">Procedimientos relacionados</h2>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {linkedProcedures.length === 0 ? (
            <li className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay procedimientos vinculados.
            </li>
          ) : (
            linkedProcedures.map((procedure) => (
              <li key={procedure.id} className="px-4 py-3">
                <Link
                  href={`/procedures/${procedure.slug}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  {procedure.title}
                </Link>
              </li>
            ))
          )}
        </ul>

        {canEdit && linkableProcedures.length > 0 ? (
          <form
            action={linkProcedureToCaseAction.bind(null, resolvedCase.id)}
            className="flex flex-wrap items-end gap-3 border-t border-slate-200 p-4 dark:border-slate-800"
          >
            <label className="flex flex-col gap-1 text-sm">
              Vincular procedimiento
              <select
                name="procedureId"
                required
                defaultValue=""
                className="min-w-[240px] rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="" disabled>
                  Selecciona un procedimiento
                </option>
                {linkableProcedures.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Vincular
            </button>
          </form>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-medium">Evidencias / Logs</h2>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {attachments.length === 0 ? (
            <li className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay evidencias ni logs adjuntos.
            </li>
          ) : (
            attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {ATTACHMENT_FILE_TYPE_LABELS[attachment.fileType]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(attachment.createdAt)}
                  </p>
                </div>
                <form
                  action={downloadCaseAttachmentAction.bind(
                    null,
                    resolvedCase.id,
                    attachment.id,
                  )}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Descargar
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>

        {canUpload ? (
          <form
            action={uploadCaseAttachmentAction.bind(null, resolvedCase.id)}
            encType="multipart/form-data"
            className="flex flex-wrap items-end gap-3 border-t border-slate-200 p-4 dark:border-slate-800"
          >
            <label className="flex flex-col gap-1 text-sm">
              Tipo de archivo
              <select
                name="fileType"
                required
                defaultValue=""
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="" disabled>
                  Selecciona un tipo
                </option>
                {ATTACHMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {ATTACHMENT_FILE_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Archivo
              <input
                name="file"
                type="file"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Subir
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
