import type { Role } from "@/modules/identity/domain/role";

const ALL_ROLES: Role[] = [
  "admin",
  "supervisor",
  "engineer_l1",
  "engineer_l2",
  "readonly",
];

export interface NavItem {
  label: string;
  href: string;
  /** Roles que ven este ítem en el Sidebar. Filtro cosmético, no de seguridad. */
  roles: Role[];
  /** Referencia a la decisión/propuesta de UI_UX_DESIGN.md que sustenta este ítem. */
  note?: string;
}

/**
 * Árbol de navegación de nivel superior, tal como se propuso en
 * UI_UX_DESIGN.md §2 (sitemap) y §3.1 (matriz de visibilidad por rol).
 * Los ítems marcados [PROPUESTA] extienden la estructura de carpetas mínima
 * de ARCHITECTURE.md §6 y quedan pendientes de confirmación final.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Procedimientos", href: "/procedures", roles: ALL_ROLES },
  {
    label: "Bitácora de Tótems",
    href: "/bitacora",
    roles: ALL_ROLES,
    note: "Procedure (contenido propio versionado, indexado por la IA) agrupado por Category jerárquica — sección propia, distinta de Documentación (Document, archivos subidos sin versionar). Pedido por el usuario para organizar el runbook operativo importado.",
  },
  {
    label: "Documentación",
    href: "/documents",
    roles: ALL_ROLES,
    note: "[PROPUESTA] Entidad Document (D5), separada de Procedure — ARCHITECTURE.md §5.3.",
  },
  { label: "Buscador", href: "/search", roles: ALL_ROLES },
  {
    label: "Asistente IA",
    href: "/ai",
    roles: ["admin", "supervisor", "engineer_l1", "engineer_l2"],
    note: "Solo Lectura excluido del chat (UC-AI-02) — confirmado con el usuario al diseñar AI_RAG_DESIGN.md, ya no es una decisión abierta.",
  },
  { label: "Favoritos", href: "/favorites", roles: ALL_ROLES },
  { label: "Historial", href: "/history", roles: ALL_ROLES },
  {
    label: "Administración",
    href: "/admin",
    roles: ["admin"],
  },
];
