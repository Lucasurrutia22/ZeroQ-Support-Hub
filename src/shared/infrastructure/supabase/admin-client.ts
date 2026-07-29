import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente admin (service role) — SOLO server-side. Nunca importar este
// módulo desde un Client Component ni exponer SUPABASE_SERVICE_ROLE_KEY al
// navegador (zeroq-security: secretos server-only).
//
// Instanciación perezosa a propósito: `createClient` valida la URL de forma
// eager y lanza si falta — si esto se ejecutara a nivel de módulo (top-level),
// Next.js lo dispara durante "Collecting page data" en `next build` (evalúa
// el árbol de módulos igual para rutas dinámicas), rompiendo el build en
// cualquier entorno sin las variables de Supabase configuradas. Con esto,
// solo se crea al primer uso real (request time).
let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}
