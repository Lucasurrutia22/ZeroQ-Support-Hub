import type { Role } from "@/modules/identity/domain/role";

// Policy objects (ARCHITECTURE.md §8). Confirmado con el usuario al diseñar
// AI_RAG_DESIGN.md: Solo Lectura queda excluido del chat conversacional
// (UC-AI-02) y por lo tanto de su Historial de conversaciones — sí conserva
// el buscador (UC-AI-01).
export function canUseAI(role: Role): boolean {
  return role !== "readonly";
}

// Buscador (UC-AI-01) — todos los roles, incluido Solo Lectura.
export function canSearch(role: Role): boolean {
  void role;
  return true;
}
