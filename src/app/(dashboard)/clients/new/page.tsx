import { auth } from "@/auth";
import { canManageClients } from "@/modules/clients/application/policies";
import type { ClientType } from "@/modules/clients/domain/types";
import { createClientAction } from "../actions";
import { CLIENT_TYPE_LABELS, errorMessageFor } from "@/lib/support-ui";

const TYPE_OPTIONS: ClientType[] = [
  "banco",
  "hospital",
  "municipalidad",
  "retail",
  "gobierno",
  "otro",
];

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  if (!canManageClients(role)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          No tienes permiso para esta acción.
        </p>
      </div>
    );
  }

  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registra un nuevo cliente de ZeroQ.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form
        action={createClientAction}
        className="flex max-w-2xl flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={200}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            name="type"
            required
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CLIENT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Crear cliente
        </button>
      </form>
    </div>
  );
}
