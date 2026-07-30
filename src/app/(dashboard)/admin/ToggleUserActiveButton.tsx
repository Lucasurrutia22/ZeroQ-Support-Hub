"use client";

import { useTransition } from "react";
import { ConfirmAction } from "@/components/shared/ConfirmAction";
import { setUserActiveAction } from "./actions";

const BUTTON_CLASSES =
  "rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900";

export function ToggleUserActiveButton({
  userId,
  userName,
  active,
}: {
  userId: string;
  userName: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // Activar no es destructivo — dispara directo. Desactivar sí pide
  // confirmación (auditoría zeroq-product-designer): antes ambas disparaban
  // al primer click.
  if (!active) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => setUserActiveAction(userId, true))}
        className={BUTTON_CLASSES}
      >
        {pending ? "…" : "Activar"}
      </button>
    );
  }

  return (
    <ConfirmAction
      action={() => setUserActiveAction(userId, false)}
      trigger="Desactivar"
      triggerClassName={BUTTON_CLASSES}
      title="¿Desactivar esta cuenta?"
      description={`${userName} no va a poder iniciar sesión hasta que la reactives.`}
      confirmLabel="Sí, desactivar"
    />
  );
}
