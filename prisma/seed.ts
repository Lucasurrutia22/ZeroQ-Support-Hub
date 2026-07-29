import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed mínimo para poder probar el módulo Authentication: un usuario demo
// por cada uno de los 5 roles fijos (D4, ARCHITECTURE.md §11). La
// contraseña es la misma para los 5 SOLO en este entorno de desarrollo —
// nunca reutilizar este patrón en un seed de producción.
const DEMO_PASSWORD = "ZeroQ.Demo123";

const DEMO_USERS = [
  { name: "Admin Demo", email: "admin@zeroq.local", role: "admin" as const },
  {
    name: "Supervisor Demo",
    email: "supervisor@zeroq.local",
    role: "supervisor" as const,
  },
  {
    name: "Ingeniero N1 Demo",
    email: "n1@zeroq.local",
    role: "engineer_l1" as const,
  },
  {
    name: "Ingeniero N2 Demo",
    email: "n2@zeroq.local",
    role: "engineer_l2" as const,
  },
  {
    name: "Solo Lectura Demo",
    email: "readonly@zeroq.local",
    role: "readonly" as const,
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const demoUser of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        active: true,
      },
    });
  }

  console.log(`Seed OK — ${DEMO_USERS.length} usuarios demo (contraseña: ${DEMO_PASSWORD}):`);
  for (const demoUser of DEMO_USERS) {
    console.log(`  - ${demoUser.email} (${demoUser.role})`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
