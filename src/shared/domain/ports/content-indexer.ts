// Port compartido: dispara la indexación RAG de contenido recién
// aprobado/creado (AI_RAG_DESIGN.md §1) sin que Knowledge/Cases dependan de
// search-ai directamente — mismo criterio que FileStorage (ver
// file-storage.ts): un contrato mínimo en shared/, implementado por
// search-ai/infrastructure, inyectado en los containers de los módulos que
// producen contenido indexable.
//
// `indexAsync` no devuelve una promesa que el caller deba esperar — indexar
// nunca debe bloquear la aprobación de un procedimiento ni la creación de un
// caso (AI_RAG_DESIGN.md §1: "una aprobación no debe esperar la latencia de
// embeddings"). El adapter es responsable de capturar sus propios errores;
// un fallo de indexación nunca debe propagarse como fallo del use case que
// la disparó.
export type IndexableSourceType = "procedure_version" | "resolved_case";

export interface ContentIndexer {
  indexAsync(sourceType: IndexableSourceType, sourceId: string): void;
}
