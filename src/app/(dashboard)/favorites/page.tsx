import Link from "next/link";
import { auth } from "@/auth";
import { listFavorites } from "@/modules/knowledge/application/use-cases/favorites";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  badgeClass,
} from "@/lib/knowledge-ui";

export default async function FavoritesPage() {
  const session = await auth();
  const actingUser = { id: session!.user.id, role: session!.user.role };

  const favorites = await listFavorites(actingUser);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Favoritos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Procedimientos que marcaste como favoritos.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {favorites.map((procedure) => (
          <li
            key={procedure.id}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-800"
          >
            <div>
              <Link
                href={`/procedures/${procedure.slug}`}
                className="font-medium hover:underline"
              >
                {procedure.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {procedure.category.name}
              </p>
            </div>
            <span className={badgeClass(STATUS_BADGE_CLASSES[procedure.status])}>
              {STATUS_LABELS[procedure.status]}
            </span>
          </li>
        ))}

        {favorites.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            Todavía no marcaste ningún procedimiento como favorito.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
