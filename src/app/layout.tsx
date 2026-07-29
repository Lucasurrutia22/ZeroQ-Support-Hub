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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
