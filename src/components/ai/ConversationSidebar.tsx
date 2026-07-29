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
        className="rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        Nueva conversación
      </Link>

      <div className="flex flex-col gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-800">
        {conversations.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">
            Todavía no tienes conversaciones.
          </p>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/ai/${conversation.id}`}
              className={`flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm ${
                conversation.id === activeConversationId
                  ? "bg-slate-100 dark:bg-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                {conversation.title}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDateTime(conversation.updatedAt)}
              </span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
