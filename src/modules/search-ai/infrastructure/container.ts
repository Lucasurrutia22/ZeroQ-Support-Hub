import { NextAfterBackgroundTaskRunner } from "@/shared/infrastructure/background/NextAfterBackgroundTaskRunner";
import { VoyageEmbeddingProvider } from "./embeddings/VoyageEmbeddingProvider";
import { PgAnswerCacheStore } from "./persistence/PgAnswerCacheStore";
import { PgVectorStore } from "./persistence/PgVectorStore";
import { PrismaAIConversationRepository } from "./persistence/PrismaAIConversationRepository";
import { PrismaAIMessageRepository } from "./persistence/PrismaAIMessageRepository";
import { PrismaSourceContentReader } from "./persistence/PrismaSourceContentReader";
import { SourceMetadataReader } from "./persistence/SourceMetadataReader";
import { TavilyWebSearchProvider } from "./websearch/TavilyWebSearchProvider";

// Composición de adapters concretos detrás de los ports del módulo — mismo
// criterio que los demás containers del proyecto. `getLLMProvider()` NO se
// re-exporta acá: vive en infrastructure/llm/llm-provider-factory.ts con su
// propia instanciación perezosa (lee LLM_PROVIDER recién en el primer uso,
// nunca al importar el módulo — ver ese archivo para el porqué).
export const embeddingProvider = new VoyageEmbeddingProvider();
export const vectorStore = new PgVectorStore();
export const answerCacheStore = new PgAnswerCacheStore();
export const aiConversationRepository = new PrismaAIConversationRepository();
export const aiMessageRepository = new PrismaAIMessageRepository();
export const sourceContentReader = new PrismaSourceContentReader();
export const sourceMetadataReader = new SourceMetadataReader();
export const webSearchProvider = new TavilyWebSearchProvider();
export const backgroundTaskRunner = new NextAfterBackgroundTaskRunner();
