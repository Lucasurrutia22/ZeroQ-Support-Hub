"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { roleLabel } from "@/modules/identity/domain/role";
import type { Role } from "@/modules/identity/domain/role";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface NavbarProps {
  user: {
    name: string;
    role: Role;
  };
}

export function Navbar({ user }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
      {/* La marca (logo + "ZeroQ Support Hub") vive en el encabezado del
          Sidebar — un solo lugar, no duplicarla acá. */}
      <div className="flex items-center gap-3">
        {/* Atajo visual al buscador — la búsqueda en sí se implementa en Fase 5 (Search & AI). */}
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900"
        >
          <span>Buscar…</span>
          <kbd className="rounded border border-slate-300 px-1 text-xs dark:border-slate-700">
            ⌘K
          </kbd>
        </Link>

        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {initials}
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="px-2 py-1 font-medium">{user.name}</p>
              <p className="px-2 pb-2 text-xs text-slate-500 dark:text-slate-400">
                {roleLabel(user.role)}
              </p>
              <hr className="my-1 border-slate-200 dark:border-slate-800" />
              <Link
                href="/favorites"
                role="menuitem"
                className="block rounded px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Favoritos
              </Link>
              <Link
                href="/history"
                role="menuitem"
                className="block rounded px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Historial
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-1 block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
