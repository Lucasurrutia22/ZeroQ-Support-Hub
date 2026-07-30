import Link from "next/link";
import { formatDateTime } from "@/lib/ai-ui";
import type { AIConversation } from "@/modules/search-ai/domain/types";

// Server Component: el listado de conversaciones es de solo lectura, no
// necesita "use client" (AI_RAG_DESIGN.md §6.1 — historial privado por
// usuario). Compartido por /ai/page.tsx y /ai/[conversationId]/page.tsx.
export function ConversationSidebar({
  conversations,
  activeConversationId,
}: {
  conversations: AIConversation[];
  activeConversationId?: string;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3">
      <Link
        href="/ai"
        className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        <span aria-hidden>+</span> Nueva conversación
      </Link>

      <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
        {conversations.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">
            Todavía no tienes conversaciones.
          </p>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <Link
                key={conversation.id}
                href={`/ai/${conversation.id}`}
                className={`flex flex-col gap-0.5 rounded-lg border-l-2 px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <span
                  className={`truncate font-medium ${
                    isActive
                      ? "text-blue-900 dark:text-blue-300"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {conversation.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(conversation.updatedAt)}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
