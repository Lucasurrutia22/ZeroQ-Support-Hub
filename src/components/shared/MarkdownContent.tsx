import Markdown, { type Components } from "react-markdown";

// Sin rehypePlugins (sin rehype-raw): react-markdown escapa cualquier
// etiqueta HTML cruda en vez de ejecutarla como DOM real — mitigación de XSS
// para contenido que puede venir de fuentes no del todo controladas (texto
// generado por el LLM, o texto pegado/importado de runbooks externos).
// Reutilizado por el chat IA (AIChatClient) y por la ficha de Procedure —
// mismo estilo visual en toda la plataforma para contenido en Markdown.
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h2 className="mt-4 mb-1 text-base font-semibold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-4 mb-1 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
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

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      <Markdown components={MARKDOWN_COMPONENTS}>{content}</Markdown>
    </div>
  );
}
