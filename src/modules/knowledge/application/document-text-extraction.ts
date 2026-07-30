// Extracción de texto para la ingesta automática Documentación → Bitácora
// (ver bitacora-auto-ingest.ts). Cubre los formatos reales que suben los
// usuarios de Documentación: texto plano, Markdown, PDF y Word (.docx, el
// formato más común para manuales). Cualquier otro formato (imágenes,
// hojas de cálculo, .doc binario viejo, etc.) devuelve `ok: false` — el
// documento igual se sube normalmente, solo no dispara la generación
// automática de Bitácora.
export type TextExtractionResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

const SUPPORTED_EXTENSIONS = ["txt", "md", "markdown", "pdf", "docx"];

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

/** Usado por la Server Action de upload para no prometer un resumen que no va a generarse. */
export function isExtractableFormat(fileName: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extensionOf(fileName));
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

  if (ext === "docx") {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      return { ok: true, text: result.value };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: `No se pudo leer el documento Word: ${message}` };
    }
  }

  return {
    ok: false,
    reason: `Formato ".${ext || "desconocido"}" no soportado para generar Bitácora automáticamente (soportado: .txt, .md, .pdf, .docx).`,
  };
}
