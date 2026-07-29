import { PrismaClient } from "../../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton de PrismaClient para todo el proceso Next.js — evita agotar
// conexiones en dev por el hot-reload de Next.js recreando el módulo.
// Usa DATABASE_URL (pooled, Supabase pgbouncer) porque este es el cliente
// de runtime; las migraciones usan DIRECT_URL vía prisma.config.ts (ver ese
// archivo para el porqué).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
