import type { SourceReferenceType } from "@/modules/search-ai/domain/types";

// Etiquetas/estilos puramente de presentación para el módulo Search & AI —
// mismo patrón que src/lib/knowledge-ui.ts y src/lib/support-ui.ts, sin
// reutilizarlos: son bounded contexts distintos.

export const SOURCE_TYPE_LABELS: Record<SourceReferenceType, string> = {
  procedure_version: "Procedimiento",
  resolved_case: "Caso Resuelto",
  web: "Fuente externa (no verificada)",
};

// Procedimiento = contenido aprobado (verificado); Caso Resuelto = contenido
// no revisado (AI_RAG_DESIGN.md §4.2) — misma paleta que
// knowledge-ui.ts STATUS_BADGE_CLASSES.approved / .in_review. "web" usa un
// gris neutro deliberadamente distinto de ambos: no es contenido de ZeroQ.
export const SOURCE_TYPE_BADGE_CLASSES: Record<SourceReferenceType, string> = {
  procedure_version:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  resolved_case:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  web: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

// Códigos de error de POST /api/ai/chat y GET /api/search (ver
// src/app/api/ai/chat/route.ts, src/app/api/search/route.ts) — mapeo de
// código -> mensaje en español. "untraceable_answer" ya trae su propio
// mensaje en español desde el backend, se usa tal cual sin pasar por este mapa.
const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden: "No tienes permiso para esta acción.",
  invalid_input: "Revisa la pregunta antes de enviarla.",
  empty_query: "La pregunta no puede estar vacía.",
  not_found: "La conversación no existe.",
  untraceable_answer:
    "La IA reportó tener contexto suficiente pero no citó ninguna fuente verificable. Intenta reformular la pregunta.",
};

export function errorMessageFor(code?: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function badgeClass(base: string): string {
  return `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${base}`;
}

export function truncate(text: string, maxLength = 300): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
