"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "./nav-items";
import type { Role } from "@/modules/identity/domain/role";

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={`shrink-0 border-r border-slate-800 bg-slate-950 text-slate-200 transition-[width] duration-150 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col border-b border-slate-800">
          <Link
            href="/procedures"
            className={`flex items-center gap-2 px-3 py-3 ${collapsed ? "justify-center px-0" : ""}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
              ZQ
            </span>
            {collapsed ? null : (
              <span className="truncate text-sm font-semibold tracking-tight text-white">
                ZeroQ Support Hub
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
            className={`mx-2 mb-2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white ${
              collapsed ? "self-center" : "self-end"
            }`}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className={collapsed ? "sr-only" : ""}>
                  {item.label}
                </span>
                {collapsed ? item.label.charAt(0) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
