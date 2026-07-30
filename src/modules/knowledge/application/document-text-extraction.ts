// Extracción de texto para la ingesta automática Documentación → Bitácora
// (ver bitacora-auto-ingest.ts). Deliberadamente acotado a los formatos que
// puede haber en Documentación en este alcance (manuales/datasheets): texto
// plano, Markdown y PDF. Cualquier otro formato (DOCX, imágenes, etc.)
// devuelve `ok: false` — el documento igual se sube normalmente, solo no
// dispara la generación automática de Bitácora.
export type TextExtractionResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
): Promise<TextExtractionResult> {
  const ext = extensionOf(fileName);

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    return { ok: true, text: buffer.toString("utf-8") };
  }

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { ok: true, text: result.text };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: `No se pudo leer el PDF: ${message}` };
    } finally {
      await parser.destroy();
    }
  }

  return {
    ok: false,
    reason: `Formato ".${ext || "desconocido"}" no soportado para generar Bitácora automáticamente (soportado: .txt, .md, .pdf).`,
  };
}
