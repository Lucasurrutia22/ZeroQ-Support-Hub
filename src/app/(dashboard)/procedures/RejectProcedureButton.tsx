"use client";

import { ConfirmAction } from "@/components/shared/ConfirmAction";
import { rejectProcedureAction } from "./actions";

export function RejectProcedureButton({
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
      action={() => rejectProcedureAction(procedureId, slug)}
      trigger="Rechazar"
      triggerClassName="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
      title="¿Rechazar este procedimiento?"
      description={`"${title}" vuelve a borrador. El autor va a tener que corregirlo y volver a pedir revisión.`}
      confirmLabel="Sí, rechazar"
    />
  );
}
