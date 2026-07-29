import { PrismaCategoryRepository } from "./persistence/PrismaCategoryRepository";
import { PrismaTagRepository } from "./persistence/PrismaTagRepository";
import { PrismaProcedureRepository } from "./persistence/PrismaProcedureRepository";
import { PrismaDocumentRepository } from "./persistence/PrismaDocumentRepository";
import { PrismaFavoriteRepository } from "./persistence/PrismaFavoriteRepository";
import { PrismaViewHistoryRepository } from "./persistence/PrismaViewHistoryRepository";
import { SupabaseFileStorage } from "@/shared/infrastructure/storage/SupabaseFileStorage";
import { contentIndexer } from "@/modules/search-ai/infrastructure/ContentIndexerAdapter";

// Composición de adapters concretos detrás de los ports del módulo. Los use
// cases importan estas instancias en vez de instanciar Prisma/Supabase
// directamente — swap de adapter (ej. otro storage) toca solo este archivo.
export const categoryRepository = new PrismaCategoryRepository();
export const tagRepository = new PrismaTagRepository();
export const procedureRepository = new PrismaProcedureRepository();
export const documentRepository = new PrismaDocumentRepository();
export const favoriteRepository = new PrismaFavoriteRepository();
export const viewHistoryRepository = new PrismaViewHistoryRepository();
export const documentStorage = new SupabaseFileStorage("documents");
// Reexportado desde search-ai/infrastructure (implementa el port compartido
// ContentIndexer, ver src/shared/domain/ports/content-indexer.ts) — los use
// cases de este módulo importan esta instancia, nunca search-ai
// directamente, para no acoplarse a su implementación concreta.
export { contentIndexer };
