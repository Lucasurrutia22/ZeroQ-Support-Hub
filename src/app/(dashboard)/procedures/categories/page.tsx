import { auth } from "@/auth";
import { listCategories } from "@/modules/knowledge/application/use-cases/categories";
import { canManageCategories } from "@/modules/knowledge/application/policies";
import type { Category } from "@/modules/knowledge/domain/types";
import { createCategoryAction } from "./actions";
import { errorMessageFor } from "@/lib/knowledge-ui";
import { FORM_INPUT_CLASSES } from "@/lib/form-ui";

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildTree(categories: Category[]): CategoryNode[] {
  const nodesById = new Map<string, CategoryNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryNode[] = [];

  for (const category of categories) {
    const node = nodesById.get(category.id)!;
    if (category.parentId && nodesById.has(category.parentId)) {
      nodesById.get(category.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function CategoryTree({ nodes, depth = 0 }: { nodes: CategoryNode[]; depth?: number }) {
  if (nodes.length === 0) return null;

  return (
    <ul className={depth === 0 ? "flex flex-col gap-1" : "mt-1 flex flex-col gap-1 border-l border-slate-200 pl-4 dark:border-slate-800"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="rounded-md px-2 py-1 text-sm">
            <span className="font-medium">{node.name}</span>
            {node.description ? (
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                {node.description}
              </span>
            ) : null}
          </div>
          <CategoryTree nodes={node.children} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const role = session!.user.role;

  const categories = await listCategories();
  const tree = buildTree(categories);
  const canManage = canManageCategories(role);
  const errorMessage = errorMessageFor(error);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías técnicas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Árbol de categorías usado para clasificar y filtrar procedimientos.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        <CategoryTree nodes={tree} />
        {tree.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay categorías creadas.
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="max-w-md rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Nueva categoría</h2>
          <form action={createCategoryAction} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Nombre
              <input
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                className={FORM_INPUT_CLASSES}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Categoría padre (opcional)
              <select
                name="parentId"
                defaultValue=""
                className={FORM_INPUT_CLASSES}
              >
                <option value="">Sin padre (categoría raíz)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Descripción (opcional)
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                className={FORM_INPUT_CLASSES}
              />
            </label>

            <button
              type="submit"
              className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              Crear categoría
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
