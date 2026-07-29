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
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
          className="m-2 self-end rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          {collapsed ? "»" : "«"}
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
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
                    ? "bg-slate-800 text-white"
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
