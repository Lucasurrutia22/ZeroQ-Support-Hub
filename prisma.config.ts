import "dotenv/config";
import { defineConfig } from "prisma/config";

// Supabase antepone un pooler (pgbouncer, puerto 6543) delante de Postgres.
// El CLI de Prisma (migrate/db push) necesita la conexión DIRECTA (puerto
// 5432) porque el pooler en modo transacción no soporta bien las
// operaciones DDL de las migraciones. El cliente en runtime (Prisma Client
// + @prisma/adapter-pg, ver src/shared/infrastructure/prisma/client.ts) usa
// en cambio DATABASE_URL (pooled) directamente — Prisma 7 no unifica esto
// en prisma.config.ts todavía (solo expone `url`/`shadowDatabaseUrl`, sin
// `directUrl`), así que el ruteo queda explícito acá.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 ya no lee el campo legacy `"prisma": {"seed": ...}` de
    // package.json (convención de Prisma 5/6) — el comando de seed se
    // configura acá. Descubierto al correr `prisma db seed` por primera vez
    // contra una base real.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
