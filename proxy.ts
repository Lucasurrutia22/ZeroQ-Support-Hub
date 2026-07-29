import { auth } from "@/auth";

// Next.js 16 renombró middleware.ts -> proxy.ts (ahora corre en runtime
// Node, no edge) — ver ARCHITECTURE.md §10. Protege todo lo que no sea la
// página de login ni los endpoints propios de auth/assets estáticos.
export const proxy = auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/procedures", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
