import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  account_inactive: "Tu cuenta está desactivada. Contacta a un administrador.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; callbackUrl?: string }>;
}) {
  const { code, callbackUrl } = await searchParams;
  const errorMessage = code
    ? (ERROR_MESSAGES[code] ?? "Ocurrió un error al iniciar sesión. Intenta de nuevo.")
    : null;

  async function authenticate(formData: FormData) {
    "use server";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: (formData.get("callbackUrl") as string) || "/procedures",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const code = "code" in error ? (error as { code: string }).code : "unknown_error";
        const params = new URLSearchParams({ code });
        if (formData.get("callbackUrl")) {
          params.set("callbackUrl", formData.get("callbackUrl") as string);
        }
        redirect(`/login?${params.toString()}`);
      }
      throw error;
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Lockup de marca fuera de la card — mismo acento azul corporativo del
          Sidebar, separa la identidad visual del formulario en sí. */}
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20">
          ZQ
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            ZeroQ Support Hub
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Centro de conocimiento inteligente para Soporte Técnico
          </p>
        </div>
      </div>

      <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Iniciar sesión
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ingresá con tu cuenta de ZeroQ.
        </p>

        {errorMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            <span aria-hidden>⚠</span>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form action={authenticate} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/procedures"} />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="nombre@zeroq.local"
              className={FORM_INPUT_CLASSES}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={FORM_INPUT_CLASSES}
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
