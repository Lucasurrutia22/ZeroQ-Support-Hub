import Link from "next/link";
import { auth } from "@/auth";
import { listOwnHistory } from "@/modules/knowledge/application/use-cases/view-history";
import {
  VIEWED_ENTITY_TYPE_LABELS,
  VIEWED_ENTITY_TYPE_BADGE_CLASSES,
  badgeClass,
  formatDate,
} from "@/lib/knowledge-ui";

export default async function HistoryPage() {
  const session = await auth();
  const actingUser = { id: session!.user.id, role: session!.user.role };

  const history = await listOwnHistory(actingUser);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Historial</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Procedimientos y documentos que visitaste recientemente.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {history.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-800"
          >
            <div>
              <Link href={entry.url} className="font-medium hover:underline">
                {entry.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Visto el {formatDate(entry.viewedAt)}
              </p>
            </div>
            <span className={badgeClass(VIEWED_ENTITY_TYPE_BADGE_CLASSES[entry.entityType])}>
              {VIEWED_ENTITY_TYPE_LABELS[entry.entityType]}
            </span>
          </li>
        ))}

        {history.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            Todavía no visitaste ningún procedimiento o documento.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
