import type { NextAuthConfig } from "next-auth";

/** Routes that require a signed-in user. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/leads",
  "/customers",
  "/quotations",
  "/followups",
  "/ai-assistant",
  "/settings",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/register"];

/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt) shared by middleware and
 * the full server config in `./index.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const signedIn = Boolean(auth?.user);

      if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return signedIn;
      }
      if (signedIn && AUTH_PAGES.includes(pathname)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
