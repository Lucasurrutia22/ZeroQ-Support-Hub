"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AIAnswerOrigin, SourceReference, AIMessageRole } from "@/modules/search-ai/domain/types";
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_BADGE_CLASSES,
  badgeClass,
  errorMessageFor,
  formatTime,
} from "@/lib/ai-ui";
import { MarkdownContent } from "@/components/shared/MarkdownContent";

export interface ChatMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  sourceReferences: SourceReference[] | null;
  answerOrigin?: AIAnswerOrigin | null;
  createdAt?: Date;
}

// Eventos NDJSON del stream de /api/ai/chat (uno por línea) — ver route.ts.
interface ChatStatusEvent {
  type: "status";
  confidence: "quick" | "deep";
  origin: "cache" | null;
}
interface ChatAnswerEvent {
  type: "answer";
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    role: AIMessageRole;
    content: string;
    sourceReferences: SourceReference[] | null;
    answerOrigin: AIAnswerOrigin | null;
    createdAt: string;
  };
}
interface ChatErrorEvent {
  type: "error";
  error: string;
  message?: string;
  status: number;
}
type ChatStreamEvent = ChatStatusEvent | ChatAnswerEvent | ChatErrorEvent;

const ORIGIN_BADGE: Record<AIAnswerOrigin, { label: string; className: string }> = {
  cache: {
    label: "⚡ Respuesta desde memoria",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  },
  deep: {
    label: "🧠 Análisis extendido",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  },
  quick: {
    label: "",
    className: "",
  },
};

const STARTER_PROMPTS = [
  "El tótem no imprime el ticket",
  "Redis no conecta",
  "¿Cómo reinicio los servicios del tótem?",
];

// UC-AI-02 (AI_RAG_DESIGN.md) — Client Component: interactividad real
// (input con estado, fetch al Route Handler, indicador de carga). El resto
// del módulo Search & AI se consume desde Server Components (ver /search y
// los page.tsx de /ai), este es el único punto que necesita "use client".
export function AIChatClient({
  conversationId,
  initialMessages,
  userInitials,
}: {
  conversationId?: string;
  initialMessages: ChatMessage[];
  userInitials?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<"quick" | "deep" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref (no state): mutarlo no debe disparar un re-render, solo necesitamos
  // el valor más reciente disponible dentro de handleSend.
  const activeConversationId = useRef(conversationId);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(overrideQuery?: string) {
    const query = (overrideQuery ?? input).trim();
    if (!query || loading) return;

    setError(null);
    setInput("");
    setLoading(true);
    setThinking(null);

    const userMessage: ChatMessage = {
      id: `local-${crypto.randomUUID()}`,
      role: "user",
      content: query,
      sourceReferences: null,
      createdAt: new Date(),
    };
    setMessages((current) => [...current, userMessage]);

    try {
      // Streaming NDJSON (una línea JSON por evento) — status llega apenas
      // termina el retrieval (rápido), answer al final (lento si no hubo hit
      // de memoria semántica). Ver route.ts.
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId.current,
          query,
        }),
      });

      if (!response.body) throw new Error("Sin cuerpo de respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;

          if (event.type === "status") {
            setThinking(event.confidence);
          } else if (event.type === "error") {
            setError(event.message ?? errorMessageFor(event.error) ?? "Ocurrió un error. Intenta de nuevo.");
          } else if (event.type === "answer") {
            if (!activeConversationId.current) {
              activeConversationId.current = event.conversationId;
              router.replace(`/ai/${event.conversationId}`);
            }
            setMessages((current) => [
              ...current,
              {
                id: event.message.id,
                role: event.message.role,
                content: event.message.content,
                sourceReferences: event.message.sourceReferences,
                answerOrigin: event.message.answerOrigin,
                createdAt: new Date(event.message.createdAt),
              },
            ]);
          }
        }
      }
    } catch {
      setError("No se pudo conectar con el asistente. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setThinking(null);
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
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              IA
            </span>
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                Asistente de Soporte ZeroQ
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Preguntame sobre procedimientos, comandos o incidentes de la Bitácora — cito
                siempre la fuente exacta.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSend(prompt)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  message.role === "user"
                    ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                }`}
              >
                {message.role === "user" ? (userInitials ?? "TÚ") : "IA"}
              </span>

              <div
                className={`flex max-w-[75%] flex-col gap-1 ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-sm bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "rounded-bl-sm border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  )}
                </div>

                {message.sourceReferences && message.sourceReferences.length > 0 ? (
                  <div className="flex w-full flex-col gap-1.5">
                    <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Fuentes
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {message.sourceReferences.map((reference) => (
                        <Link
                          key={`${reference.type}-${reference.sourceId}`}
                          href={reference.url}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                        >
                          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                            {reference.title}
                          </span>
                          <span
                            className={badgeClass(SOURCE_TYPE_BADGE_CLASSES[reference.type])}
                          >
                            {SOURCE_TYPE_LABELS[reference.type]}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 px-1">
                  {message.createdAt ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatTime(message.createdAt)}
                    </span>
                  ) : null}
                  {message.answerOrigin && message.answerOrigin !== "quick" ? (
                    <span
                      className={badgeClass(ORIGIN_BADGE[message.answerOrigin].className)}
                    >
                      {ORIGIN_BADGE[message.answerOrigin].label}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}

        {loading ? (
          <div className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              IA
            </span>
            {thinking === "deep" ? (
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                <span aria-hidden>🧠</span>
                <span>Este caso necesita más análisis — puede tardar un poco más…</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            )}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Escribe tu pregunta…"
          className="w-full bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
