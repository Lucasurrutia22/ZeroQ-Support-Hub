import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-xl font-semibold">ZeroQ Support Hub</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ingresa con tu cuenta de ZeroQ.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <form action={authenticate} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/procedures"} />

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
