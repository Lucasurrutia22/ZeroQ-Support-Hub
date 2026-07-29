import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canUseAI } from "@/modules/search-ai/application/policies";
import { listConversations } from "@/modules/search-ai/application/use-cases/conversations";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { AIChatClient } from "@/components/ai/AIChatClient";

// UC-AI-02 (AI_RAG_DESIGN.md) — Solo Lectura queda excluido del chat
// conversacional (confirmado con el usuario al diseñar AI_RAG_DESIGN.md). El
// Sidebar (nav-items.ts) ya oculta el link para ese rol; este redirect es
// defensa en profundidad por si se accede directo por URL, igual que otras
// páginas restringidas del proyecto.
export default async function AIChatPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!canUseAI(role)) {
    redirect("/procedures");
  }

  const result = await listConversations({ id: session!.user.id, role });
  const conversations = result.ok ? result.value : [];

  return (
    <div className="flex h-full min-h-0 gap-6">
      <ConversationSidebar conversations={conversations} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h1 className="text-2xl font-semibold">Asistente IA</h1>
        <AIChatClient initialMessages={[]} />
      </div>
    </div>
  );
}
