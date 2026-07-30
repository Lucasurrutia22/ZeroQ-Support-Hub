"use client";

import { useState } from "react";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";

// Auditoría de diseño (zeroq-product-designer): el contenido ya se renderiza
// como Markdown real para quien LEE un procedimiento (MarkdownContent), pero
// quien lo ESCRIBE seguía tipeando a ciegas en un <textarea> plano sin ver
// nunca el resultado antes de guardar. Pestañas simples (sin librería nueva)
// en vez de un split-view: menos ancho necesario, más fácil de usar en
// pantallas chicas (ver §6 responsive del skill).
function tabClass(active: boolean): string {
  return `rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400"
      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
  }`;
}

export function ProcedureContentEditor({
  name,
  defaultValue = "",
  rows = 14,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [content, setContent] = useState(defaultValue);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => setTab("edit")} className={tabClass(tab === "edit")}>
          Editar
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={tabClass(tab === "preview")}
        >
          Preview
        </button>
      </div>

      {tab === "edit" ? (
        <textarea
          name={name}
          required
          rows={rows}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className={`${FORM_INPUT_CLASSES} font-mono`}
        />
      ) : (
        <div
          className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
          style={{ minHeight: `${rows * 1.6}rem` }}
        >
          {content.trim() ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nada para previsualizar todavía — escribí algo en la pestaña Editar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
