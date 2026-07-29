import { z } from "zod";

// UC-AI-02 — body de POST /api/ai/chat.
export const askAISchema = z.object({
  conversationId: z.string().min(1).optional(),
  query: z.string().trim().min(1, "La pregunta no puede estar vacía.").max(2000),
});

// UC-AI-01 — query params de GET /api/search.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "La búsqueda no puede estar vacía.").max(500),
  categoryId: z.string().min(1).optional(),
});
