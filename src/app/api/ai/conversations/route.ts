import { NextResponse } from "next/server";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { listConversations } from "@/modules/search-ai/application/use-cases/conversations";

// Historial de conversaciones IA (AI_RAG_DESIGN.md §6) — GET porque es
// puramente de lectura, consumido por el sidebar de conversaciones del chat.
export async function GET() {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const result = await listConversations(actingUser);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status: result.error.code === "forbidden" ? 403 : 500 },
    );
  }

  return NextResponse.json({ conversations: result.value });
}
