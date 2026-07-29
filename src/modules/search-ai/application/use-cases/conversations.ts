import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { aiConversationRepository, aiMessageRepository } from "../../infrastructure/container";
import { canUseAI } from "../policies";
import type { AIConversation, AIConversationWithMessages } from "../../domain/types";

const TITLE_MAX_LENGTH = 60;

// Título generado de la primera pregunta, no pedido al usuario (AI_RAG_DESIGN.md §6.1).
export function titleFromQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  return trimmed.length > TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, TITLE_MAX_LENGTH)}…`
    : trimmed;
}

// UC-AI-02 (Historial) — privado por usuario (AI_RAG_DESIGN.md §6.1): un
// usuario nunca ve conversaciones de otro, ni Supervisor/Admin tienen acá una
// vista de auditoría (eso vive en AuditLog/Analytics, no en este listado).
export async function listConversations(
  actingUser: ActingUser,
): Promise<Result<AIConversation[]>> {
  if (!canUseAI(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no tiene acceso al chat de IA."));
  }
  return ok(await aiConversationRepository.listByUser(actingUser.id));
}

export async function getConversation(
  actingUser: ActingUser,
  conversationId: string,
): Promise<Result<AIConversationWithMessages>> {
  if (!canUseAI(actingUser.role)) {
    return err(new DomainError("forbidden", "Tu rol no tiene acceso al chat de IA."));
  }

  const conversation = await aiConversationRepository.findById(conversationId);
  if (!conversation || conversation.userId !== actingUser.id) {
    // Mismo error para "no existe" y "no es tuya" — no confirmar la
    // existencia de conversaciones ajenas (privacidad, §6.1).
    return err(new DomainError("not_found", "La conversación no existe."));
  }

  const messages = await aiMessageRepository.listByConversation(conversationId);
  return ok({ ...conversation, messages });
}
