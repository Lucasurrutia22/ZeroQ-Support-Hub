import { auth } from "@/auth";
import type { ActingUser } from "../domain/role";

// Server Actions/Route Handlers no reciben la sesión como prop (a diferencia
// de los Server Components ya renderizados) — la vuelven a pedir acá. El
// `proxy.ts` ya garantiza que no se llega a estas rutas sin sesión, pero la
// verificación explícita es defensa en profundidad (ARCHITECTURE.md §7).
export async function getActingUserOrThrow(): Promise<ActingUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No hay sesión activa.");
  }
  return { id: session.user.id, role: session.user.role };
}
