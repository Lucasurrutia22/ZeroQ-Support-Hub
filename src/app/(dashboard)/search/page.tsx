import Link from "next/link";
import { semanticSearch } from "@/modules/search-ai/application/use-cases/semantic-search";
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_BADGE_CLASSES,
  badgeClass,
  truncate,
} from "@/lib/ai-ui";

// UC-AI-01 (USE_CASES.md) — buscador híbrido disponible para todos los
// roles, incluido Solo Lectura (canSearch no restringe ninguno). Server
// Component: llama semanticSearch() directamente, sin pasar por
// /api/search (ese Route Handler es para el fetch del chat cliente).
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; clientId?: string }>;
}) {
  const { q, categoryId, clientId } = await searchParams;
  const query = q?.trim() ?? "";

  // semanticSearch puede lanzar si el EmbeddingProvider (Voyage) falla —
  // fallo de infraestructura, no de negocio (ARCHITECTURE.md §8). Se atrapa
  // acá para mostrar un mensaje claro en vez de la pantalla de error
  // genérica de Next.js.
  let results: Awaited<ReturnType<typeof semanticSearch>> | null = null;
  let providerError = false;
  if (query) {
    try {
      results = await semanticSearch(query, { categoryId, clientId }, 10);
    } catch {
      providerError = true;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Buscador</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Busca en procedimientos aprobados y casos resueltos usando lenguaje natural.
        </p>
      </div>

      <form action="/search" method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ej: la impresora térmica no imprime"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Buscar
        </button>
      </form>

      {providerError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          El buscador no está disponible en este momento (proveedor de embeddings inaccesible).
          Intenta de nuevo en unos minutos.
        </p>
      ) : results === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escribe una consulta para buscar en la base de conocimiento.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No se encontraron resultados para tu búsqueda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((result) => (
            <li
              key={result.id}
              className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <Link
                  href={result.entityUrl}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                  {result.sourceTitle}
                </Link>
                <span
                  className={badgeClass(SOURCE_TYPE_BADGE_CLASSES[result.sourceType])}
                >
                  {SOURCE_TYPE_LABELS[result.sourceType]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {truncate(result.content)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
