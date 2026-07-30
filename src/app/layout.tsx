import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter (next/font): auto-hosteada por Next (sin request externo en
// runtime, sin layout shift) — reemplaza el stack de fuentes del sistema
// por defecto, primer paso concreto del pase de diseño "más profesional"
// pedido por el usuario.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ZeroQ Support Hub",
  description: "Centro de conocimiento inteligente para el área de soporte técnico de ZeroQ.",
};

// Script bloqueante (antes del primer paint) para el toggle de tema: lee la
// preferencia guardada en localStorage o, si no hay ninguna, la del sistema,
// y aplica la clase `.dark` en <html> de inmediato — evita el flash de tema
// incorrecto que ocurriría si esto se hiciera en un useEffect de React (que
// corre después del primer render). Ver ThemeToggle.tsx, la contraparte que
// escribe en localStorage cuando el usuario cambia el tema.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("zeroq-theme");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
