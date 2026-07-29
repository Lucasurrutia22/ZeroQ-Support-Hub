import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canUseAI } from "@/modules/search-ai/application/policies";
import {
  getConversation,
  listConversations,
} from "@/modules/search-ai/application/use-cases/conversations";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { AIChatClient, type ChatMessage } from "@/components/ai/AIChatClient";

// UC-AI-02 — misma defensa en profundidad que /ai/page.tsx para Solo Lectura.
export default async function AIConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  const role = session!.user.role;

  if (!canUseAI(role)) {
    redirect("/dashboard");
  }

  const actingUser = { id: session!.user.id, role };

  const [conversationsResult, conversationResult] = await Promise.all([
    listConversations(actingUser),
    getConversation(actingUser, conversationId),
  ]);

  if (!conversationResult.ok) {
    // "not_found" cubre tanto "no existe" como "no es tuya" (privacidad,
    // AI_RAG_DESIGN.md §6.1) — no distinguir en la UI. "forbidden" no
    // debería ocurrir tras el chequeo de canUseAI de arriba, pero se cubre
    // igual por si el rol cambia entre el redirect y esta llamada.
    if (conversationResult.error.code === "forbidden") {
      redirect("/dashboard");
    }
    notFound();
  }

  const conversations = conversationsResult.ok ? conversationsResult.value : [];
  const initialMessages: ChatMessage[] = conversationResult.value.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    sourceReferences: message.sourceReferences,
  }));

  return (
    <div className="flex h-full min-h-0 gap-6">
      <ConversationSidebar conversations={conversations} activeConversationId={conversationId} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h1 className="truncate text-2xl font-semibold">{conversationResult.value.title}</h1>
        <AIChatClient conversationId={conversationId} initialMessages={initialMessages} />
      </div>
    </div>
  );
}
