"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { accountService } from "@/lib/auth/account-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { runAction, type ActionResult } from "./action";

/** Reduces any callback URL to a same-origin path so it can't redirect off-site. */
function safeRedirect(target: unknown, fallback: string) {
  if (typeof target !== "string" || !target) return fallback;
  try {
    const url = new URL(target, "http://local.invalid");
    const path = `${url.pathname}${url.search}`;
    return path.startsWith("/") && !path.startsWith("//") && path !== "/login" ? path : fallback;
  } catch {
    return fallback;
  }
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 10, 60_000).ok) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirect(callbackUrl, "/dashboard"),
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "That email and password combination doesn't match our records." };
    }
    throw error;
  }
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 5, 10 * 60_000).ok) {
    return { ok: false, error: "Too many sign-up attempts. Please try again later." };
  }

  const result = await runAction(async () => {
    const data = registerSchema.parse(input);
    await accountService.register(data);
    return data;
  });
  if (!result.ok) return result;

  try {
    await signIn("credentials", {
      email: result.data.email,
      password: result.data.password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        error: "Your account was created, but we couldn't sign you in. Please log in.",
      };
    }
    throw error;
  }
  return { ok: true, data: undefined };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
