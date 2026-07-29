import type {
  DocumentFileType,
  ProcedureStatus,
  RiskLevel,
} from "@/modules/knowledge/domain/types";

// Etiquetas/estilos puramente de presentación para el módulo Knowledge —
// no repite lógica de negocio (esa vive en application/policies.ts), solo
// centraliza el texto en español y las clases Tailwind usadas en varias
// pantallas para evitar duplicarlas pantalla por pantalla.

export const STATUS_LABELS: Record<ProcedureStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobado",
  deprecated: "Deprecado",
};

export const STATUS_BADGE_CLASSES: Record<ProcedureStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  deprecated: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
};

export const DOCUMENT_FILE_TYPE_LABELS: Record<DocumentFileType, string> = {
  manual: "Manual",
  datasheet: "Datasheet",
  firmware_notes: "Notas de firmware",
  otro: "Otro",
};

// Códigos de error que redirigen las Server Actions ya implementadas (ver
// src/app/(dashboard)/procedures/actions.ts, .../categories/actions.ts,
// .../documents/actions.ts) — mapeo de código -> mensaje en español.
const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "No tienes permiso para esta acción.",
  invalid_input: "Revisa los datos del formulario.",
  not_found: "No se encontró el recurso solicitado.",
  category_not_found: "La categoría no existe.",
  parent_not_found: "La categoría padre no existe.",
  document_not_found: "El documento no existe.",
  missing_file: "Selecciona un archivo.",
  invalid_status:
    "El procedimiento no está en el estado esperado para esta acción.",
};

export function errorMessageFor(code?: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function badgeClass(base: string): string {
  return `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${base}`;
}
