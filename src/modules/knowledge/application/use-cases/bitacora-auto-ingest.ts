import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import type { Document } from "../../domain/types";
import { categoryRepository, getLLMProvider } from "../../infrastructure/container";
import { extractTextFromFile } from "../document-text-extraction";
import { createProcedure, requestReview } from "./procedures";

const BITACORA_ROOT_SLUG = "bitacora-totems";

// Límite de caracteres enviados al LLM para el resumen — documentos grandes
// (manuales completos) se truncan en vez de chunkear + map-reduce: mantiene
// esto simple para el volumen esperado, a costa de no resumir documentos muy
// extensos completos (mismo espíritu de "no diseñar para lo hipotético" que
// el resto del proyecto; si aparece el caso real, se revisita).
const MAX_RAW_TEXT_CHARS = 12_000;

/**
 * "Bitácora" no es un modelo propio — es la subcategoría `bitacora-totems`
 * (y sus hijas directas) dentro de Category, ver bitacora/page.tsx. Esta
 * función replica esa misma regla para decidir si un Document recién subido
 * corresponde a esa sección.
 */
export async function isBitacoraCategory(categoryId: string): Promise<boolean> {
  const root = await categoryRepository.findBySlug(BITACORA_ROOT_SLUG);
  if (!root) return false;
  if (categoryId === root.id) return true;

  const category = await categoryRepository.findById(categoryId);
  return category?.parentId === root.id;
}

export interface BitacoraIngestionResult {
  procedureId: string;
}

/**
 * Genera automáticamente una entrada de Bitácora (Procedure) a partir de un
 * Document recién subido: extrae texto → resume con el LLM activo → crea el
 * Procedure → lo manda a revisión (in_review), igual que cualquier
 * procedimiento creado a mano. Deliberadamente NO lo aprueba ni lo indexa
 * acá: la indexación para el asistente de IA sigue disparándose solo al
 * aprobar (approveProcedure → contentIndexer.indexAsync), para que un
 * resumen mal generado por el modelo no llegue a las respuestas de la IA
 * sin que un supervisor/admin lo revise primero.
 *
 * Se llama en modo fire-and-forget desde uploadDocument (mismo patrón que
 * ContentIndexerAdapter) — nunca debe lanzar sin capturar, porque no hay
 * quien atrape la excepción del lado del caller.
 */
export async function ingestDocumentAsBitacoraEntry(
  actingUser: ActingUser,
  document: Document,
  fileBuffer: Buffer,
  fileName: string,
): Promise<Result<BitacoraIngestionResult | null>> {
  const eligible = await isBitacoraCategory(document.categoryId);
  if (!eligible) {
    return ok(null);
  }

  const extraction = await extractTextFromFile(fileBuffer, fileName);
  if (!extraction.ok) {
    return err(new DomainError("unsupported_format", extraction.reason));
  }

  const rawText = extraction.text.slice(0, MAX_RAW_TEXT_CHARS).trim();
  if (!rawText) {
    return err(
      new DomainError("empty_content", "El documento no contiene texto extraíble."),
    );
  }

  let contentMarkdown: string;
  try {
    const summary = await getLLMProvider().summarizeDocument({
      title: document.title,
      rawText,
    });
    contentMarkdown = summary.contentMarkdown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new DomainError("summarization_failed", `Falló el resumen por IA: ${message}`));
  }

  const created = await createProcedure(actingUser, {
    title: document.title,
    categoryId: document.categoryId,
    riskLevel: "low",
    contentMarkdown,
    tagNames: ["documento-importado"],
  });
  if (!created.ok) {
    return err(created.error);
  }

  const reviewed = await requestReview(actingUser, created.value.id);
  if (!reviewed.ok) {
    return err(reviewed.error);
  }

  return ok({ procedureId: created.value.id });
}
