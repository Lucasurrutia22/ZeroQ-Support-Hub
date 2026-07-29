// Etiquetas/estilos puramente de presentación para el módulo Identity
// (panel de Administración) — mismo patrón que knowledge-ui.ts/ai-ui.ts.

export const ACTIVE_BADGE_CLASSES: Record<"active" | "inactive", string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "No tienes permiso para esta acción.",
  invalid_input: "Revisa los datos del formulario.",
  not_found: "El usuario no existe.",
  email_taken: "Ya existe un usuario con ese email.",
  cannot_deactivate_self: "No podés desactivar tu propia cuenta.",
  cannot_demote_self: "No podés cambiar tu propio rol de administrador.",
};

export function errorMessageFor(code?: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function badgeClass(base: string): string {
  return `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${base}`;
}
