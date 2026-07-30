import { roleLabel, type Role } from "@/modules/identity/domain/role";
import { errorMessageFor } from "@/lib/identity-ui";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";
import { createUserAction } from "../actions";

const ROLES: Role[] = ["admin", "supervisor", "engineer_l1", "engineer_l2", "readonly"];

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo usuario</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Crea una cuenta nueva para el Support Hub.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form action={createUserAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            type="text"
            name="name"
            required
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className={FORM_INPUT_CLASSES}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Rol
          <select
            name="role"
            defaultValue="engineer_l1"
            className={FORM_INPUT_CLASSES}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
}
