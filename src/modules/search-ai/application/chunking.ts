// Chunking — lógica pura, sin I/O (AI_RAG_DESIGN.md §3). No depende de
// Prisma ni de ningún SDK de IA: solo texto entra, chunks de texto salen.
//
// Estimación de tokens: heurística chars/4 (aproximación razonable para
// español/inglés), no un tokenizer real — no se agregó una dependencia de
// tokenización solo para esto. Si en producción el conteo real del
// proveedor activo difiere mucho de esta estimación, es un ajuste local a
// esta constante, no un cambio de arquitectura.
const CHARS_PER_TOKEN_ESTIMATE = 4;
const TARGET_TOKENS = 400;
const MAX_TOKENS = 500;
const OVERLAP_RATIO = 0.15;

export interface ChunkCandidate {
  content: string;
  chunkIndex: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

// 1) Split por encabezado `##` — cada sección es un candidato a chunk.
function splitByHeadings(markdown: string): string[] {
  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n").trim());

  return sections.filter((section) => section.length > 0);
}

// 2) Dentro de una sección demasiado grande: separar en bloques atómicos —
// un bloque de código ``` nunca se parte, un párrafo (separado por línea en
// blanco) sí puede quedar solo en su propio bloque.
function splitIntoBlocks(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let paragraphBuffer: string[] = [];
  let i = 0;

  function flushParagraph() {
    const joined = paragraphBuffer.join("\n").trim();
    if (joined) blocks.push(joined);
    paragraphBuffer = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flushParagraph();
      const codeLines = [line];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        codeLines.push(lines[i]); // fence de cierre
        i += 1;
      }
      blocks.push(codeLines.join("\n"));
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      i += 1;
      continue;
    }

    paragraphBuffer.push(line);
    i += 1;
  }
  flushParagraph();

  return blocks;
}

// 3) Empaquetar bloques en chunks de ~300-500 tokens con ~15% overlap. Un
// bloque de código más grande que MAX_TOKENS se acepta igual como chunk
// sobredimensionado — partirlo lo haría recuperable pero inútil.
function packBlocksIntoChunks(blocks: string[]): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const block of blocks) {
    const blockTokens = estimateTokens(block);

    if (currentTokens > 0 && currentTokens + blockTokens > MAX_TOKENS) {
      chunks.push(current.join("\n\n"));

      const overlapBudget = Math.round(TARGET_TOKENS * OVERLAP_RATIO);
      const last = current[current.length - 1];
      if (last && estimateTokens(last) <= overlapBudget) {
        current = [last];
        currentTokens = estimateTokens(last);
      } else {
        current = [];
        currentTokens = 0;
      }
    }

    current.push(block);
    currentTokens += blockTokens;
  }

  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks;
}

export function chunkMarkdown(markdown: string): ChunkCandidate[] {
  const sections = splitByHeadings(markdown);
  const rawChunks: string[] = [];

  for (const section of sections) {
    if (estimateTokens(section) <= MAX_TOKENS) {
      rawChunks.push(section);
      continue;
    }
    rawChunks.push(...packBlocksIntoChunks(splitIntoBlocks(section)));
  }

  return rawChunks
    .map((content) => content.trim())
    .filter((content) => content.length > 0)
    .map((content, chunkIndex) => ({ content, chunkIndex }));
}
