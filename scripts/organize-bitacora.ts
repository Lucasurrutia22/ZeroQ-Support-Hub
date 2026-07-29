import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../src/lib/slugify";

// Reorganiza los 109 procedimientos cargados por scripts/import-runbook.ts:
// corrige títulos que quedaron mal por el parseo automático (fragmentos de
// comandos usados como título), y los reclasifica de la categoría plana
// "Operación y Mantenimiento de Tótems" a una jerarquía de categoría padre +
// 13 subcategorías por tema. Uso único, seguro de re-correr (upsert de
// categorías, update directo de Procedure por id).

const PARENT_SLUG = "bitacora-totems";
const PARENT_NAME = "Bitácora de Tótems";

const SUBCATEGORIES = {
  hora: "Hora, NTP y Certificados",
  impresion: "Impresión y Tickets",
  pantalla: "Pantalla, Video y Multimedia",
  red: "Red, Proxy y Acceso Remoto",
  docker: "Docker y Servicios del Tótem",
  basedatos: "Base de Datos (Postgres y Redis)",
  modulos: "Módulos y API del Rutificador",
  transferencia: "Transferencia de Archivos y Logs",
  windows: "Windows y PowerShell",
  instalacion: "Instalación y Hardware",
  seguridad: "Seguridad",
  linux: "Utilidades Generales de Linux",
  referencia: "Referencia General",
} as const;

type SubcategoryKey = keyof typeof SUBCATEGORIES;

// Títulos que el parser dejó como fragmentos de comando en vez de una
// descripción — se corrigen antes de reclasificar.
const TITLE_FIXES: Record<string, string> = {
  cms52961v002f1cjkfj1ydrk3: "Script de rotación de pantalla y calibración táctil (xrandr/xinput)",
  cms528niw001h1cjkemlezwdx: "Descargar archivos y logs del tótem (ejemplos SCP/PSCP)",
  cms52ayp4005n1cjkk4i22wg6: "Reintentar restart de backend hasta confirmar arranque",
  cms52axmy005l1cjkp3schdsn: "Consultar estado de módulos (ModuloStates) en Postgres",
  cms52amq300511cjk3aumh3i5: "Ejemplo: liberar sesión de un módulo específico vía API (DELETE)",
  cms528zhx00231cjk5lgyauej: "Consultar y depurar registros antiguos de Tickets por sucursal",
  cms5299bn002l1cjkvxbiv801: "Reiniciar servicios con --remove-orphans si persiste una falla",
};

// id de Procedure -> subcategoría. Asignado a mano leyendo los 109 títulos
// reales (no heurística de keywords) para que quede correctamente agrupado.
const CATEGORY_ASSIGNMENTS: Record<string, SubcategoryKey> = {
  cms52961v002f1cjkfj1ydrk3: "pantalla",
  cms528niw001h1cjkemlezwdx: "transferencia",
  cms529nto003b1cjkj151nry0: "pantalla",
  cms5282sk000f1cjkf6rvw0tu: "red",
  cms528dp7000z1cjk59y6d15d: "basedatos",
  cms5292t400291cjktyclk5qk: "hora",
  cms52b57k005z1cjkjdb1pxf7: "docker",
  cms52a3n000431cjkhe4d45pj: "pantalla",
  cms5291q000271cjkensx09hd: "docker",
  cms52ayp4005n1cjkk4i22wg6: "docker",
  cms529ewn002v1cjk5a4ccdh8: "basedatos",
  cms52azsx005p1cjki85g8jjv: "pantalla",
  cms52b0vi005r1cjkk99xjv4o: "windows",
  cms529q35003f1cjk3jezh48v: "basedatos",
  cms5288cv000p1cjkbj8a0p20: "linux",
  cms529r69003h1cjkn59234vq: "basedatos",
  cms52b6aq00611cjk44z8azm4: "windows",
  cms52as7c005b1cjkcaa2whwq: "windows",
  cms5294yz002d1cjkhq6thr4u: "red",
  cms528j4c00191cjke5ythlbp: "hora",
  cms529cp0002r1cjkve5075h7: "hora",
  cms527zc900091cjkdj1stuah: "impresion",
  cms527y8800071cjk0gp52xh1: "impresion",
  cms5287ai000n1cjkc20r78gs: "modulos",
  cms528k7c001b1cjkmcqno6gd: "hora",
  cms528om1001j1cjkyeg1j9cu: "hora",
  cms5280gb000b1cjk0g3ztf0x: "pantalla",
  cms52axmy005l1cjkp3schdsn: "basedatos",
  cms528rwl001p1cjki7elo9bl: "referencia",
  cms528gxy00151cjk8ll6uuvf: "red",
  cms529tia003l1cjkktit3af6: "red",
  cms52a4qk00451cjkizp3ioks: "hora",
  cms52amq300511cjk3aumh3i5: "modulos",
  cms529afg002n1cjkn4sau0lk: "modulos",
  cms52988c002j1cjknhl6i5sc: "modulos",
  cms52a68w00471cjk4hir2a8x: "seguridad",
  cms528esf00111cjkne90478j: "transferencia",
  cms527uvr00011cjkfa8cy4f8: "hora",
  cms529vsr003p1cjkbgzs2ylu: "linux",
  cms528zhx00231cjk5lgyauej: "basedatos",
  cms529dt4002t1cjkyxivjogn: "docker",
  cms527x3n00051cjkdktf6b9w: "impresion",
  cms5289ez000r1cjk60gq8t6d: "basedatos",
  cms52b31c005v1cjkqhfxizzh: "docker",
  cms529jcp00331cjk9kcveqo0: "docker",
  cms529h59002z1cjkz5ie1kdy: "basedatos",
  cms529bid002p1cjkrtzha6l7: "modulos",
  cms528w9l001x1cjkmedmimyl: "transferencia",
  cms5281mo000d1cjkazdb80s8: "basedatos",
  cms52adzb004l1cjk2nmh1k13: "docker",
  cms52aown00551cjktgxot67a: "docker",
  cms529oym003d1cjk6l0rd1if: "transferencia",
  cms528cm6000x1cjkmyf0bp6d: "basedatos",
  cms529kg700351cjkbb9lgnea: "docker",
  cms529wwr003r1cjkjn7jhuiv: "red",
  cms529sdi003j1cjkqu5dg2vx: "red",
  cms52acw4004j1cjks2rak8jg: "modulos",
  cms52aicx004t1cjkgak7bj3k: "basedatos",
  cms52avhj005h1cjkpa8pp7hj: "windows",
  cms52ar3t00591cjkg1paupvr: "docker",
  cms52ah9h004r1cjk63afng9k: "instalacion",
  cms52a7es00491cjk18fpb332: "hora",
  cms528mem001f1cjkzdquoevz: "docker",
  cms529z5m003v1cjkdhx1g2yd: "hora",
  cms52a8it004b1cjk5re6v0wt: "referencia",
  cms52aq1000571cjkqytok0e0: "docker",
  cms52867h000l1cjkwk5j9744: "red",
  cms528fuz00131cjktbacd2dm: "pantalla",
  cms528i0t00171cjkzvdn6og0: "basedatos",
  cms528ah1000t1cjkp8ldmm2n: "seguridad",
  cms5299bn002l1cjkvxbiv801: "docker",
  cms528bjs000v1cjkco6k050y: "red",
  cms5290mh00251cjk9xtwvgnv: "referencia",
  cms5293vg002b1cjkutro8d5g: "red",
  cms528v5l001v1cjkawjbal4v: "linux",
  cms52a2j100411cjk7uxpbztp: "instalacion",
  cms529mmy00391cjk0nkkzbrx: "instalacion",
  cms52a1fn003z1cjkgzkhugj1: "instalacion",
  cms528lac001d1cjk3vt56xi0: "instalacion",
  cms529fzp002x1cjkvz9tozsn: "instalacion",
  cms528yf700211cjk584kpeff: "docker",
  cms52af27004n1cjk1g7wwijv: "basedatos",
  cms52ajfu004v1cjkphh3m587: "basedatos",
  cms529i9200311cjknfs37qjz: "modulos",
  cms52aufc005f1cjkkku8qm7f: "windows",
  cms527w0i00031cjkz83pq0r2: "docker",
  cms52anu500531cjk8ay2ik0w: "modulos",
  cms52a9lk004d1cjkilj2nqwt: "modulos",
  cms528qtp001n1cjkn2rfp7lk: "seguridad",
  cms52aaoq004f1cjkonez4uu1: "modulos",
  cms52ag5y004p1cjkk9r48kju: "red",
  cms5283zv000h1cjk4n8c5doh: "docker",
  cms52853a000j1cjkawdg6bpc: "docker",
  cms52akij004x1cjk9fwrhlfq: "red",
  cms529uoh003n1cjk5wujskyw: "pantalla",
  cms529y15003t1cjkxlxgq6t4: "pantalla",
  cms52a0b8003x1cjkr1usrwt9: "red",
  cms528pq7001l1cjk74dfnsk3: "pantalla",
  cms528xca001z1cjkw05n8ism: "pantalla",
  cms52awkn005j1cjkefb5zjqj: "impresion",
  cms52allo004z1cjkws4j66l4: "transferencia",
  cms52absg004h1cjkajr97mpb: "docker",
  cms528u2k001t1cjkljw99q5t: "docker",
  cms52atc7005d1cjkc228q53m: "windows",
  cms529ljr00371cjks79z9d9r: "modulos",
  cms52b1y1005t1cjkkzin9xmh: "windows",
  cms52b44i005x1cjk4pm44n8y: "windows",
  cms528szg001r1cjksxgisqxt: "basedatos",
  cms52975h002h1cjk8w55cvz6: "pantalla",
};

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const oldCategory = await prisma.category.findUnique({
    where: { slug: "operacion-mantenimiento-totems" },
  });
  if (!oldCategory) {
    throw new Error('No existe la categoría "operacion-mantenimiento-totems" — ¿ya se corrió este script?');
  }

  const parent = await prisma.category.upsert({
    where: { slug: PARENT_SLUG },
    update: {},
    create: { name: PARENT_NAME, slug: PARENT_SLUG },
  });

  const subcategoryIds: Record<SubcategoryKey, string> = {} as Record<SubcategoryKey, string>;
  for (const [key, name] of Object.entries(SUBCATEGORIES) as [SubcategoryKey, string][]) {
    const slug = `${PARENT_SLUG}-${slugify(name)}`;
    const category = await prisma.category.upsert({
      where: { slug },
      update: { parentId: parent.id },
      create: { name, slug, parentId: parent.id },
    });
    subcategoryIds[key] = category.id;
  }
  console.log(`Categoría padre "${PARENT_NAME}" + ${Object.keys(SUBCATEGORIES).length} subcategorías listas.`);

  let renamed = 0;
  for (const [procedureId, newTitle] of Object.entries(TITLE_FIXES)) {
    const base = slugify(newTitle) || "procedimiento";
    let slug = base;
    let suffix = 1;
    while (await prisma.procedure.findFirst({ where: { slug, id: { not: procedureId } } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    await prisma.procedure.update({
      where: { id: procedureId },
      data: { title: newTitle, slug },
    });
    renamed += 1;
  }
  console.log(`Títulos corregidos: ${renamed}.`);

  let reclassified = 0;
  let missing = 0;
  const allIds = await prisma.procedure.findMany({
    where: { categoryId: oldCategory.id },
    select: { id: true },
  });

  for (const { id } of allIds) {
    const key = CATEGORY_ASSIGNMENTS[id];
    if (!key) {
      console.warn(`  Sin categoría asignada para Procedure ${id} — se deja en "${oldCategory.name}".`);
      missing += 1;
      continue;
    }
    await prisma.procedure.update({
      where: { id },
      data: { categoryId: subcategoryIds[key] },
    });
    reclassified += 1;
  }
  console.log(`Reclasificados: ${reclassified}. Sin asignar (quedaron en la categoría vieja): ${missing}.`);

  const remaining = await prisma.procedure.count({ where: { categoryId: oldCategory.id } });
  if (remaining === 0) {
    await prisma.category.delete({ where: { id: oldCategory.id } });
    console.log('Categoría plana "operacion-mantenimiento-totems" eliminada (ya sin procedimientos).');
  } else {
    console.log(`La categoría vieja quedó con ${remaining} procedimientos sin reclasificar — no se borra.`);
  }

  const counts = await prisma.category.findMany({
    where: { parentId: parent.id },
    select: { name: true, _count: { select: { procedures: true } } },
    orderBy: { name: "asc" },
  });
  console.log("\nDistribución final:");
  for (const c of counts) {
    console.log(`  ${c.name}: ${c._count.procedures}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
