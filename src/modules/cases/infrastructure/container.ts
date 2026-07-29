import { PrismaResolvedCaseRepository } from "./persistence/PrismaResolvedCaseRepository";
import { PrismaAttachmentRepository } from "./persistence/PrismaAttachmentRepository";
import { SupabaseFileStorage } from "@/shared/infrastructure/storage/SupabaseFileStorage";
import { contentIndexer } from "@/modules/search-ai/infrastructure/ContentIndexerAdapter";

export const resolvedCaseRepository = new PrismaResolvedCaseRepository();
export const attachmentRepository = new PrismaAttachmentRepository();
// Bucket separado de "documents" (Knowledge) — evidencias/logs de casos son
// contenido operativo distinto, no manuales de referencia.
export const attachmentStorage = new SupabaseFileStorage("case-attachments");
// Reexportado desde search-ai/infrastructure (port compartido ContentIndexer) — ver knowledge/infrastructure/container.ts para el mismo criterio.
export { contentIndexer };
