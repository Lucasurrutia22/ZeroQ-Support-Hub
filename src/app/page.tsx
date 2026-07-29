import { redirect } from "next/navigation";

// La raíz del sitio no tiene contenido propio: el punto de entrada real de la
// aplicación es /dashboard, dentro del route group (dashboard) que provee el
// app shell (Navbar + Sidebar). Ver ARCHITECTURE.md §6/§7 y UI_UX_DESIGN.md §2.
export default function RootPage() {
  redirect("/dashboard");
}
