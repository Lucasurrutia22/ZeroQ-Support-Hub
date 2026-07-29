import { handlers } from "@/auth";

// Uno de los usos sancionados de Route Handlers por ARCHITECTURE.md §7
// (flujo de autenticación) — Auth.js maneja el intercambio HTTP completo.
export const { GET, POST } = handlers;
