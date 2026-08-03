import { NextResponse } from "next/server";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { getLLMProvider } from "@/modules/search-ai/infrastructure/llm/llm-provider-factory";

// TEMPORAL — diagnóstico puntual de por qué el chat de IA falla en
// producción con Groq configurado. Nunca expone el valor real de ninguna
// API key, solo longitud/prefijo (para detectar espacios, comillas
// literales, o valores vacíos pegados por error desde el dashboard de
// Vercel). Solo admin. Se borra apenas se resuelve el diagnóstico.
export async function GET() {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser || actingUser.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  function describe(name: string) {
    const value = process.env[name];
    return {
      set: value !== undefined,
      length: value?.length ?? 0,
      prefix: value ? value.slice(0, 6) : null,
      suffix: value ? value.slice(-4) : null,
      hasQuotes: value ? value.startsWith('"') || value.endsWith('"') : false,
      hasWhitespace: value ? value !== value.trim() : false,
    };
  }

  // Llamada real, mínima (sin tools, sin salida estructurada) al proveedor
  // configurado — aísla si el problema es conectividad/auth básica con el
  // proveedor, separado de la complejidad de tool-calling + salida
  // estructurada del chat real.
  let liveCallResult: { ok: boolean; detail: string };
  try {
    const summary = await getLLMProvider().summarizeDocument({
      title: "prueba",
      rawText: "Este es un documento de prueba. Decí 'ok' si podés leerlo.",
    });
    liveCallResult = { ok: true, detail: summary.contentMarkdown.slice(0, 200) };
  } catch (error) {
    liveCallResult = {
      ok: false,
      detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }

  return NextResponse.json({
    LLM_PROVIDER_raw: process.env.LLM_PROVIDER ?? null,
    LLM_MODEL: describe("LLM_MODEL"),
    GROQ_API_KEY: describe("GROQ_API_KEY"),
    ANTHROPIC_API_KEY: describe("ANTHROPIC_API_KEY"),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION ?? null,
    liveCallResult,
  });
}
