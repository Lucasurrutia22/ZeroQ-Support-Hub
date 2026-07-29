"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Markdown, { type Components } from "react-markdown";
import type { SourceReference, AIMessageRole } from "@/modules/search-ai/domain/types";
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
} from "@/lib/ai-ui";

// Sin rehypePlugins (sin rehype-raw): react-markdown escapa cualquier
// etiqueta HTML cruda que el LLM haya generado por error (nunca la ejecuta
// como DOM real) — es la mitigación en la capa de UI para el mismo problema
// que ya se ataca en el prompt (ask-ai.ts regla 9: "prohibido HTML"). Estilos
// vía `components` en vez de @tailwindcss/typography: no vale la pena una
// dependencia nueva para esto.
const MARKDOWN_COMPONENTS: Components = {
  h2: ({ children }) => <h2 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h2>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded bg-slate-200 p-2 text-xs dark:bg-slate-800">
      {children}
    </pre>
  ),
};

export interface ChatMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  sourceReferences: SourceReference[] | null;
}

interface ChatSuccessResponse {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    role: AIMessageRole;
    content: string;
    sourceReferences: SourceReference[] | null;
    createdAt: string;
  };
}

interface ChatErrorResponse {
  error: string;
  message?: string;
}

// UC-AI-02 (AI_RAG_DESIGN.md) — Client Component: interactividad real
// (input con estado, fetch al Route Handler, indicador de carga). El resto
// del módulo Search & AI se consume desde Server Components (ver /search y
// los page.tsx de /ai), este es el único punto que necesita "use client".
export function AIChatClient({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref (no state): mutarlo no debe disparar un re-render, solo necesitamos
  // el valor más reciente disponible dentro de handleSend.
  const activeConversationId = useRef(conversationId);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setError(null);
    setInput("");
    setLoading(true);

    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: query,
      sourceReferences: null,
    };
    setMessages((current) => [...current, userMessage]);

    try {
      // Sin streaming en este alcance — respuesta completa de una vez, ver AI_RAG_DESIGN.md
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId.current,
          query,
        }),
      });

      const data: ChatSuccessResponse | ChatErrorResponse = await response.json();

      if (!response.ok) {
        const errorData = data as ChatErrorResponse;
        setError(errorData.message ?? errorMessageFor(errorData.error) ?? "Ocurrió un error. Intenta de nuevo.");
        return;
      }

      const successData = data as ChatSuccessResponse;

      if (!activeConversationId.current) {
        activeConversationId.current = successData.conversationId;
        router.replace(`/ai/${successData.conversationId}`);
      }

      setMessages((current) => [
        ...current,
        {
          id: successData.message.id,
          role: successData.message.role,
          content: successData.message.content,
          sourceReferences: successData.message.sourceReferences,
        },
      ]);
    } catch {
      setError("No se pudo conectar con el asistente. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-slate-200 p-4 dark:border-slate-800">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pregúntale al asistente sobre procedimientos, comandos o casos resueltos.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-md px-3 py-2 ${
                  message.role === "user"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-900"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="[&>*:first-child]:mt-0">
                    <Markdown components={MARKDOWN_COMPONENTS}>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                )}

                {message.sourceReferences && message.sourceReferences.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-1 border-t border-slate-300 pt-2 text-xs dark:border-slate-700">
                    <p className="font-medium">Fuentes:</p>
                    {message.sourceReferences.map((reference) => (
                      <div
                        key={`${reference.type}-${reference.sourceId}`}
                        className="flex items-center gap-2"
                      >
                        <Link href={reference.url} className="hover:underline">
                          {reference.title}
                        </Link>
                        <span className={badgeClass(SOURCE_TYPE_BADGE_CLASSES[reference.type])}>
                          {SOURCE_TYPE_LABELS[reference.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}

        {loading ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              Pensando…
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Escribe tu pregunta…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
