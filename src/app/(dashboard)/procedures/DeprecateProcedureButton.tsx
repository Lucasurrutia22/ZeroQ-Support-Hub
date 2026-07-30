"use client";

import { ConfirmAction } from "@/components/shared/ConfirmAction";
import { deprecateProcedureAction } from "./actions";

export function DeprecateProcedureButton({
  procedureId,
  slug,
  title,
}: {
  procedureId: string;
  slug: string;
  title: string;
}) {
  return (
    <ConfirmAction
      action={() => deprecateProcedureAction(procedureId, slug)}
      trigger="Deprecar"
      triggerClassName="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      title="¿Deprecar este procedimiento?"
      description={`"${title}" deja de aparecer como vigente para el resto del equipo. Esta acción no se puede deshacer desde la interfaz.`}
      confirmLabel="Sí, deprecar"
    />
  );
}
