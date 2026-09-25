import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-md text-muted-foreground">Log in to your sales workspace.</p>
      <div className="mt-8">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        New to AI Sales Manager?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}
