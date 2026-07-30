// Clases compartidas para inputs/selects/textareas de formularios —
// auditoría de diseño (zeroq-product-designer): antes cada pantalla repetía
// "rounded-md border border-slate-300 px-3 py-2 text-sm..." sin anillo de
// foco, un gap real de WCAG 2.2 (foco visible por teclado). Un solo lugar
// para el token en vez de repetirlo sin foco en cada pantalla nueva.
export const FORM_INPUT_CLASSES =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

// Variante compacta para selects/inputs inline dentro de una tabla (ej. el
// selector de rol por fila en Administración) — mismo foco, menos padding.
export const FORM_INPUT_COMPACT_CLASSES =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
