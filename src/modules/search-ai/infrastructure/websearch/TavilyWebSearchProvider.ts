import { tavily } from "@tavily/core";
import type { WebSearchProvider, WebSearchResult } from "@/modules/search-ai/domain/ports";

// Tavily: 1000 créditos gratis/mes sin tarjeta (verificado contra la
// documentación vigente antes de elegirlo, mismo criterio que Voyage). El
// SDK oficial (`tavily()`) no valida la key al construirse (solo la guarda),
// así que no hace falta instanciación perezosa acá — a diferencia de
// getSupabaseAdmin()/getLLMProvider(), que sí validan credenciales eager.
export class TavilyWebSearchProvider implements WebSearchProvider {
  private readonly client = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const response = await this.client.search(query, { maxResults });
    return response.results.map((result) => ({
      url: result.url,
      title: result.title,
      snippet: result.content,
    }));
  }
}
