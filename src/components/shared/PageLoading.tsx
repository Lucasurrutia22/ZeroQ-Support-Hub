// Skeleton genérico (auditoría zeroq-product-designer: ninguna sección tenía
// loading.tsx — con conexión lenta la app se sentía congelada entre
// navegaciones). Un solo esqueleto reutilizable en vez de uno por pantalla:
// aproxima cualquier layout de título + lista/tabla, que es la mayoría de
// las pantallas de este proyecto. `animate-pulse` es Tailwind nativo, sin
// librería nueva.
export function PageLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" role="status" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-md border border-slate-200 dark:border-slate-800"
          />
        ))}
      </div>
    </div>
  );
}
