"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "./input";

/** URL-synced, debounced search box (`?q=`). */
export function SearchInput({
  placeholder,
  label,
  className,
}: {
  placeholder: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      startTransition(() =>
        router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false })
      );
    }, 250);
    return () => clearTimeout(t);
  }, [q, searchParams, pathname, router]);

  return (
    <div className={cn("relative", className)}>
      {pending ? (
        <Loader2
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle"
          aria-hidden
        />
      ) : (
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
      )}
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
