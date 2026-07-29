import { redirect } from "next/navigation";

// La raíz del sitio no tiene contenido propio: el punto de entrada real de la
// aplicación es /procedures (Dashboard fue descontinuado — sin uso real,
// eliminado 2026-07-29), dentro del route group (dashboard) que provee el
// app shell (Navbar + Sidebar). Ver ARCHITECTURE.md §6/§7 y UI_UX_DESIGN.md §2.
export default function RootPage() {
  redirect("/procedures");
}
