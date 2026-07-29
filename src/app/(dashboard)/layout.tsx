import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

// Server Component: obtiene la sesión real (Auth.js) y arma el armazón
// visual, sin lógica de negocio (ARCHITECTURE.md §7). El `proxy.ts` ya
// protege esta ruta a nivel de red; este redirect es defensa en profundidad
// por si el layout se renderiza fuera de ese camino (p. ej. server actions).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={{ name: session.user.name ?? session.user.email ?? "Usuario", role: session.user.role }} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
