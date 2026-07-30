export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 dark:bg-slate-950">
      {/* Grilla de puntos sutil (patrón Linear/Vercel) — le da profundidad al
          fondo claro en vez del gris plano anterior, sin competir con la card. */}
      <div
        aria-hidden
        className="absolute inset-0 [background-image:radial-gradient(circle,rgba(37,99,235,0.28)_1px,transparent_1px)] [background-size:28px_28px] dark:[background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1px)]"
      />
      {/* Acento de marca — mismo azul corporativo del resto de la plataforma,
          más presente en claro (pedido explícito: "el fondo claro esta muy
          apagado") que en oscuro, donde ya tenía suficiente contraste. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.24),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(29,78,216,0.20),transparent_45%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.12),transparent_40%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
