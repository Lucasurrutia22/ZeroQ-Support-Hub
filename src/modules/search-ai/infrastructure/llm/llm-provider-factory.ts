import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { createGroq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";
import type { LLMProvider } from "@/modules/search-ai/domain/ports";
import { VercelAiLLMProvider } from "./VercelAiLLMProvider";

// Este archivo es TODO lo que hay que tocar para cambiar de proveedor de LLM
// (pedido explícito: "no debe depender de un proveedor específico" — Claude,
// OpenAI, Ollama, Azure OpenAI, Groq intercambiables por configuración, sin
// tocar AskAIUseCase ni el resto de search-ai). Los 5 SDKs (@ai-sdk/anthropic,
// @ai-sdk/openai, @ai-sdk/azure, @ai-sdk/groq, ollama-ai-provider-v2) exponen
// todos un `LanguageModel` (spec LanguageModelV2) — VercelAiLLMProvider es un
// único adapter que no sabe ni le importa cuál está detrás.
//
// Groq se agregó como alternativa gratuita para producción: Ollama no es
// alcanzable desde funciones serverless de Vercel (corre en la máquina local
// del usuario), y Anthropic/OpenAI requieren facturación — Groq tiene nivel
// gratis real (límites por minuto/día, sin tarjeta) sirviendo modelos
// abiertos (Llama, gpt-oss) en hardware propio de muy baja latencia.
export type LLMProviderName = "anthropic" | "openai" | "azure-openai" | "groq" | "ollama";

const DEFAULT_MODEL_BY_PROVIDER: Record<LLMProviderName, string> = {
  // Defaults razonables al momento de escribir esto — verificar contra la
  // documentación vigente del proveedor antes de desplegar (mismo espíritu
  // que la corrección de voyage-3 → voyage-3.5 en AI_RAG_DESIGN.md §2:
  // los nombres de modelo cambian más rápido que este archivo). LLM_MODEL
  // en .env los sobreescribe explícitamente.
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-5",
  "azure-openai": "gpt-4o",
  // "llama-3.3-70b-versatile" (el default más común en ejemplos de Groq) se
  // da de baja el 2026-08-16 — se usa directamente el reemplazo recomendado
  // por Groq (gpt-oss-120b, modelo abierto de OpenAI, soporta tool-calling)
  // para no heredar una fecha de vencimiento a dos semanas de escribir esto.
  groq: "openai/gpt-oss-120b",
  ollama: "llama3.2",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno "${name}", requerida por LLM_PROVIDER="${process.env.LLM_PROVIDER}".`,
    );
  }
  return value;
}

function resolveProviderName(): LLMProviderName {
  const raw = process.env.LLM_PROVIDER ?? "anthropic";
  const valid: LLMProviderName[] = ["anthropic", "openai", "azure-openai", "groq", "ollama"];
  if (!valid.includes(raw as LLMProviderName)) {
    throw new Error(
      `LLM_PROVIDER="${raw}" no es válido. Valores soportados: ${valid.join(", ")}.`,
    );
  }
  return raw as LLMProviderName;
}

function buildLanguageModel(providerName: LLMProviderName): LanguageModel {
  const modelId = process.env.LLM_MODEL || DEFAULT_MODEL_BY_PROVIDER[providerName];

  switch (providerName) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
      return openai(modelId);
    }
    case "azure-openai": {
      const azure = createAzure({
        resourceName: requireEnv("AZURE_OPENAI_RESOURCE_NAME"),
        apiKey: requireEnv("AZURE_OPENAI_API_KEY"),
      });
      // En Azure el "modelId" que espera el SDK es el nombre del deployment,
      // no el modelo base — AZURE_OPENAI_DEPLOYMENT tiene prioridad sobre
      // LLM_MODEL si ambos están seteados, porque un deployment es siempre
      // más específico que un id de modelo genérico.
      return azure(process.env.AZURE_OPENAI_DEPLOYMENT || modelId);
    }
    case "groq": {
      const groq = createGroq({ apiKey: requireEnv("GROQ_API_KEY") });
      return groq(modelId);
    }
    case "ollama": {
      const ollama = createOllama({
        baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api",
      });
      return ollama(modelId);
    }
  }
}

// Instanciación perezosa (mismo patrón que getSupabaseAdmin(), ver memoria
// del proyecto): los `create*` de arriba validan credenciales/URLs, y
// construirlos a nivel de módulo rompería `next build` en cualquier entorno
// sin esas env vars — Next.js evalúa el árbol de módulos incluso para rutas
// dinámicas ("Collecting page data").
let cached: LLMProvider | undefined;

export function getLLMProvider(): LLMProvider {
  if (!cached) {
    const providerName = resolveProviderName();
    const model = buildLanguageModel(providerName);
    cached = new VercelAiLLMProvider(model);
  }
  return cached;
}
