import type { AssetType, ClientType } from "@/modules/clients/domain/types";
import type { AttachmentFileType } from "@/modules/cases/domain/types";

// Etiquetas/estilos puramente de presentación para el módulo Support
// (Clients + Cases) — mismo patrón que src/lib/knowledge-ui.ts, pero sin
// reutilizarlo: son enums de bounded contexts distintos.

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  banco: "Banco",
  hospital: "Hospital",
  municipalidad: "Municipalidad",
  retail: "Retail",
  gobierno: "Gobierno",
  otro: "Otro",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  totem: "Tótem",
  modulo_atencion: "Módulo de atención",
  pantalla: "Pantalla",
  impresora: "Impresora",
  servidor: "Servidor",
  tv_box: "TV Box",
  otro: "Otro",
};

export const ATTACHMENT_FILE_TYPE_LABELS: Record<AttachmentFileType, string> = {
  image: "Imagen",
  video: "Video",
  pdf: "PDF",
  config: "Configuración",
  log: "Log",
};

export const ACTIVE_BADGE_CLASSES: Record<"active" | "inactive", string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

// Códigos de error que redirigen las Server Actions ya implementadas (ver
// src/app/(dashboard)/clients/actions.ts, .../cases/actions.ts) — mapeo de
// código -> mensaje en español.
const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "No tienes permiso para esta acción.",
  invalid_input: "Revisa los datos del formulario.",
  not_found: "No se encontró el recurso solicitado.",
  category_not_found: "La categoría no existe.",
  client_not_found: "El cliente no existe.",
  asset_not_found: "El activo no existe.",
  case_not_found: "El caso no existe.",
  missing_file: "Selecciona un archivo.",
};

export function errorMessageFor(code?: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function badgeClass(base: string): string {
  return `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${base}`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  return `${minutes} min`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}
