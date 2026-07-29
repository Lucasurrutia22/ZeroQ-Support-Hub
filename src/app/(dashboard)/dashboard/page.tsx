// Dashboard vacío, a propósito: el contenido real (KPIs por rol) se define en
// UI_UX_DESIGN.md §4.7 y se implementa en Fase 6 (ROADMAP.md), una vez existan
// datos reales de Knowledge/Cases/Analytics que agregar. Por ahora solo
// confirma que el app shell (Navbar + Sidebar) renderiza correctamente.
export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col items-start justify-start gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Próximamente: indicadores según rol (ver UI_UX_DESIGN.md §4.7).
      </p>
    </div>
  );
}
