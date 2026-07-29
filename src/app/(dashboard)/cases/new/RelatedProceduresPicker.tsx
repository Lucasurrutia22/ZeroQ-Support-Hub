"use client";

import { useState } from "react";

interface ProcedureOption {
  id: string;
  title: string;
}

// Client Component pequeño y aislado: junta los checkboxes elegidos en un
// input oculto `relatedProcedureIds` como CSV (formato que espera
// src/lib/schemas/support.ts, createResolvedCaseSchema). El resto del
// formulario de /cases/new sigue siendo un <form action={...}> normal.
export function RelatedProceduresPicker({
  procedures,
}: {
  procedures: ProcedureOption[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="relatedProcedureIds" value={selected.join(",")} />
      {procedures.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay procedimientos para vincular.
        </p>
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-slate-300 p-2 dark:border-slate-700">
          {procedures.map((procedure) => (
            <label
              key={procedure.id}
              className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <input
                type="checkbox"
                checked={selected.includes(procedure.id)}
                onChange={() => toggle(procedure.id)}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              {procedure.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
