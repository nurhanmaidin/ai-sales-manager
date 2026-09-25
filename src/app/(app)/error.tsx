"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border bg-background text-warning shadow-xs">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        This page didn&apos;t load properly
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Something went wrong on our side. Your data is safe — try again, or head back to your
        dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-subtle">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RefreshCw aria-hidden /> Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
