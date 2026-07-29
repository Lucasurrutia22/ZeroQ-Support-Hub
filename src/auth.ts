import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { prisma } from "@/shared/infrastructure/prisma/client";
import { loginSchema } from "@/lib/schemas/login";
import type { Role } from "@/modules/identity/domain/role";

// Auth.js con el provider Credentials no persiste usuarios ni soporta
// sesiones en base de datos (ver ARCHITECTURE.md §10) — por eso no hay
// adapter Prisma acá, `authorize()` consulta `User` directamente.

class InvalidLoginError extends CredentialsSignin {
  code = "invalid_credentials";
}

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}

// Referencia sin uso directo: necesaria para que TS resuelva el módulo que
// se está aumentando arriba (ver docs Auth.js "Module Augmentation").
export type _JWTAugmentationAnchor = JWT;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Sesión corta (un turno) — mitiga no poder revocar sesiones JWT al
    // instante (limitación de Auth.js con Credentials, ver ARCHITECTURE.md §10).
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (rawCredentials) => {
        let email: string;
        let password: string;

        try {
          ({ email, password } = await loginSchema.parseAsync(rawCredentials));
        } catch (error) {
          if (error instanceof ZodError) throw new InvalidLoginError();
          throw error;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new InvalidLoginError();
        if (!user.active) throw new AccountInactiveError();

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash,
        );
        if (!passwordMatches) throw new InvalidLoginError();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Recién autenticado — `user` es lo que devolvió authorize().
        token.role = (user as { role: Role }).role;
        return token;
      }

      // Requests subsiguientes: re-verificar contra la base que el usuario
      // sigue activo. Devolver `null` invalida la sesión (tipo real de
      // Auth.js: `jwt` retorna `Awaitable<JWT | null>`) — es la mitigación
      // acordada a la limitación de JWT-only con Credentials.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { active: true, role: true },
        });

        if (!dbUser || !dbUser.active) return null;

        token.role = dbUser.role as Role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
