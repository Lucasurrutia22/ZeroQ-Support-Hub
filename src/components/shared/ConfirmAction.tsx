"use client";

import { useState, useTransition, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

// Confirmación para acciones destructivas/irreversibles (Rechazar un
// procedimiento, Desactivar un usuario) — auditoría de diseño (zeroq-product-designer):
// esas acciones disparaban de inmediato al primer click, sin paso intermedio.
// Envuelve un Server Action ya bindeado (ej. `rejectProcedureAction.bind(null, id, slug)`)
// e invocarlo directo desde el cliente (sin <form>) es un patrón soportado por
// Next.js — la acción sigue corriendo en el servidor igual.
//
// Primitivo de Radix Dialog (focus-trap, Escape, aria, portal) con los tokens
// visuales ya existentes del proyecto (blue/slate, rounded-xl, shadow-xl) —
// no se adoptó shadcn/ui completo para esto: su `init` reescribiría
// globals.css con un segundo sistema de variables de color en paralelo al que
// ya existe, justo la inconsistencia que el Design System busca evitar.
interface ConfirmActionProps {
  action: () => Promise<void>;
  trigger: ReactNode;
  triggerClassName: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** Por defecto, botón de confirmación en rojo (acción destructiva). */
  confirmClassName?: string;
}

const DEFAULT_CONFIRM_CLASSES =
  "rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400";

export function ConfirmAction({
  action,
  trigger,
  triggerClassName,
  title,
  description,
  confirmLabel,
  confirmClassName = DEFAULT_CONFIRM_CLASSES,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await action();
      setOpen(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger type="button" className={triggerClassName}>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-150 focus:outline-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 dark:border-slate-800 dark:bg-slate-900"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close
              type="button"
              disabled={pending}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className={confirmClassName}
            >
              {pending ? "Aplicando…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
