import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUsers } from "@/modules/identity/application/use-cases/users";
import { roleLabel, type Role } from "@/modules/identity/domain/role";
import { ACTIVE_BADGE_CLASSES, badgeClass, errorMessageFor } from "@/lib/identity-ui";
import { FORM_INPUT_COMPACT_CLASSES } from "@/lib/form-ui";
import { setUserRoleAction } from "./actions";
import { ToggleUserActiveButton } from "./ToggleUserActiveButton";

const ROLES: Role[] = ["admin", "supervisor", "engineer_l1", "engineer_l2", "readonly"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const actingUser = { id: session!.user.id, role: session!.user.role };

  const result = await listUsers(actingUser);
  if (!result.ok) redirect("/procedures");

  const users = result.value;
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Administración</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Usuarios del Support Hub — crear cuentas, activar/desactivar y cambiar roles.
          </p>
        </div>
        <Link
          href="/admin/new"
          className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Nuevo usuario
        </Link>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((user) => {
              const isSelf = user.id === actingUser.id;
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">
                    {user.name}
                    {isSelf ? <span className="ml-1 text-xs text-slate-400">(vos)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <form
                      action={setUserRoleAction.bind(null, user.id)}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={isSelf}
                        className={FORM_INPUT_COMPACT_CLASSES}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                      {!isSelf ? (
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
                        >
                          Guardar
                        </button>
                      ) : null}
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={badgeClass(
                        ACTIVE_BADGE_CLASSES[user.active ? "active" : "inactive"],
                      )}
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isSelf ? (
                      <ToggleUserActiveButton
                        userId={user.id}
                        userName={user.name}
                        active={user.active}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
