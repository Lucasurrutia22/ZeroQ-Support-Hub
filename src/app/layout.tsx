import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
