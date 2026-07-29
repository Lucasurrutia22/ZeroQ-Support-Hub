import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../src/lib/slugify";
import { indexContent } from "../src/modules/search-ai/application/use-cases/index-content";

// Import puntual de un runbook operativo pegado por el usuario (soporte de
// tótems: impresión, red, Docker/Postgres/Redis, hardware) — no es un seed
// de datos demo (eso es prisma/seed.ts), es carga real de contenido de
// Knowledge para alimentar el RAG. Corre una sola vez; es seguro re-correrlo
// (salta títulos que ya existen).
//
// Separa por líneas que son solo guiones/em-dashes (el formato real del
// texto pegado), toma la primera línea no vacía como título y el resto como
// contenido markdown del Procedure.

// El parser de abajo regenera SIEMPRE estos 7 títulos (fragmentos de comando
// mal cortados por el separador de líneas) desde el .txt crudo, pero
// scripts/organize-bitacora.ts ya les asignó títulos descriptivos reales en
// la base — sin este mapeo, cada re-corrida del import crea 7 procedimientos
// duplicados (con contenido idéntico) porque el título parseado ya no
// coincide con el título real en la DB. Confirmado por comparación exacta de
// contentMarkdown entre duplicado y original.
const TITLE_ALIASES: Record<string, string> = {
  "#descargar archivos#": "Descargar archivos y logs del tótem (ejemplos SCP/PSCP)",
  "docker exec -it postgres psql -U postgres": "Consultar y depurar registros antiguos de Tickets por sucursal",
  "#!/bin/sh": "Script de rotación de pantalla y calibración táctil (xrandr/xinput)",
  "paso 1: docker-compose down --remove-orphans": "Reiniciar servicios con --remove-orphans si persiste una falla",
  "curl --location --request DELETE 'http://150.213.1.210:3030/api/v2/modulos/26308/session' --data ''":
    "Ejemplo: liberar sesión de un módulo específico vía API (DELETE)",
  "cd local": "Consultar estado de módulos (ModuloStates) en Postgres",
  "aplicar varias veces": "Reintentar restart de backend hasta confirmar arranque",
};

const CATEGORY_SLUG = "operacion-mantenimiento-totems";
const CATEGORY_NAME = "Operación y Mantenimiento de Tótems";
const AUTHOR_EMAIL = "admin@zeroq.local";

const HIGH_RISK_KEYWORDS = ["delete from", "drop ", "docker-compose down -v", "rm -rf", "eliminar"];
const MEDIUM_RISK_KEYWORDS = ["reboot", "restart", "reiniciar", "docker-compose down", "docker stop"];

function inferRiskLevel(content: string): "low" | "medium" | "high" {
  const lower = content.toLowerCase();
  if (HIGH_RISK_KEYWORDS.some((keyword) => lower.includes(keyword))) return "high";
  if (MEDIUM_RISK_KEYWORDS.some((keyword) => lower.includes(keyword))) return "medium";
  return "low";
}

function parseRunbook(raw: string): { title: string; content: string }[] {
  const blocks = raw.split(/^[-—]{3,}\s*$/m);

  return blocks
    .map((block) => block.trim())
    .filter((block) => block.length > 20)
    .map((block) => {
      const lines = block.split("\n");
      const titleIndex = lines.findIndex((line) => line.trim().length > 0);
      const title = (lines[titleIndex] ?? "Procedimiento sin título").trim().replace(/[:.]$/, "");
      const content = lines.slice(titleIndex + 1).join("\n").trim();
      return { title, content: content || block };
    })
    .filter((entry) => entry.content.length > 10);
}

async function uniqueSlugFor(prisma: PrismaClient, title: string): Promise<string> {
  const base = slugify(title) || "procedimiento";
  let candidate = base;
  let suffix = 1;
  while (await prisma.procedure.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const author = await prisma.user.findUnique({ where: { email: AUTHOR_EMAIL } });
  if (!author) {
    throw new Error(`No existe el usuario ${AUTHOR_EMAIL} — corré "npm run db:seed" primero.`);
  }

  // Lazy: no crear la categoría plana si no hay nada nuevo que meterle ahí
  // (todos los procedimientos ya viven reorganizados en Bitácora de Tótems
  // vía scripts/organize-bitacora.ts) — un upsert incondicional acá dejaba
  // una categoría fantasma vacía en cada re-corrida del script.
  let category: { id: string } | null = null;
  async function getOrCreateFallbackCategory(): Promise<{ id: string }> {
    if (!category) {
      category = await prisma.category.upsert({
        where: { slug: CATEGORY_SLUG },
        update: {},
        create: { name: CATEGORY_NAME, slug: CATEGORY_SLUG },
      });
    }
    return category;
  }

  const rawText = fs.readFileSync(
    path.join(__dirname, "data", "totem-runbook.txt"),
    "utf8",
  );
  const entries = parseRunbook(rawText).map((entry) => ({
    ...entry,
    title: TITLE_ALIASES[entry.title] ?? entry.title,
  }));
  console.log(`Parseados ${entries.length} procedimientos del runbook.`);

  // Se reindexan tanto los procedimientos nuevos como los que ya existían
  // (findUnique trae currentVersionId) — hace que el script sea seguro de
  // re-correr como "reintentar indexación" una vez que VOYAGE_API_KEY esté
  // disponible, sin duplicar Procedures.
  const versionIdsToIndex: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Busca por título en TODA la tabla, no solo en `category.id`: el runbook
    // pudo haber sido reorganizado en otras categorías (scripts/organize-bitacora.ts)
    // después de la carga inicial, y filtrar por categoryId aquí volvería a
    // crear duplicados si esa categoría cambió o fue borrada.
    const existing = await prisma.procedure.findFirst({
      where: { title: entry.title },
    });
    if (existing) {
      skipped += 1;
      if (existing.currentVersionId) versionIdsToIndex.push(existing.currentVersionId);
      continue;
    }

    const slug = await uniqueSlugFor(prisma, entry.title);
    const riskLevel = inferRiskLevel(entry.content);
    const fallbackCategory = await getOrCreateFallbackCategory();

    const version = await prisma.$transaction(async (tx) => {
      const createdProcedure = await tx.procedure.create({
        data: {
          title: entry.title,
          slug,
          categoryId: fallbackCategory.id,
          riskLevel,
          authorId: author.id,
          status: "approved",
        },
      });

      const createdVersion = await tx.procedureVersion.create({
        data: {
          procedureId: createdProcedure.id,
          versionNumber: 1,
          contentMarkdown: entry.content,
          authorId: author.id,
          changeSummary: "Importado desde runbook operativo (carga inicial).",
        },
      });

      await tx.procedure.update({
        where: { id: createdProcedure.id },
        data: { currentVersionId: createdVersion.id },
      });

      return createdVersion;
    });

    versionIdsToIndex.push(version.id);
    created += 1;
  }

  console.log(`Creados: ${created}. Ya existían (saltados): ${skipped}.`);
  await prisma.$disconnect();

  if (versionIdsToIndex.length === 0) {
    console.log("Nada que indexar.");
    return;
  }

  console.log(`Indexando ${versionIdsToIndex.length} procedimientos (requiere VOYAGE_API_KEY)...`);
  // Throttle a 1 request cada 21s: la cuenta de Voyage sin método de pago
  // cargado está limitada a 3 RPM (ver AI_APICallError "reduced rate limits
  // of 3 RPM" — el usuario decidió no cargar tarjeta), y los reintentos por
  // defecto del AI SDK no esperan lo suficiente para ese límite.
  const THROTTLE_MS = 21_000;
  let indexed = 0;
  let failed = 0;
  for (let i = 0; i < versionIdsToIndex.length; i++) {
    const versionId = versionIdsToIndex[i];
    const result = await indexContent("procedure_version", versionId);
    if (result.ok) {
      indexed += 1;
      console.log(`  [${i + 1}/${versionIdsToIndex.length}] OK ${versionId}`);
    } else {
      failed += 1;
      console.error(`  [${i + 1}/${versionIdsToIndex.length}] Falló indexar ${versionId}: ${result.error.code} — ${result.error.message}`);
    }
    if (i < versionIdsToIndex.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
    }
  }
  console.log(`Indexación: ${indexed} OK, ${failed} fallidos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
