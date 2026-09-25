"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_META,
  PRIORITY_META,
  SOURCE_LABELS,
} from "@/lib/constants";

const ALL = "all";

export function LeadsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("new");
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  // Debounced search-as-you-type.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const t = setTimeout(() => update("q", q.trim() || null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["q", "status", "priority", "source", "created"].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative lg:w-72">
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
          placeholder="Search name, company, phone…"
          aria-label="Search leads"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Select
          aria-label="Filter by status"
          size="md"
          className="sm:w-[150px]"
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => update("status", v)}
          options={[
            { value: ALL, label: "All statuses" },
            ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_META[s].label })),
          ]}
        />
        <Select
          aria-label="Filter by priority"
          className="sm:w-[140px]"
          value={searchParams.get("priority") ?? ALL}
          onValueChange={(v) => update("priority", v)}
          options={[
            { value: ALL, label: "All priorities" },
            ...LEAD_PRIORITIES.map((p) => ({
              value: p,
              label: `${PRIORITY_META[p].label} priority`,
            })),
          ]}
        />
        <Select
          aria-label="Filter by source"
          className="sm:w-[140px]"
          value={searchParams.get("source") ?? ALL}
          onValueChange={(v) => update("source", v)}
          options={[
            { value: ALL, label: "All sources" },
            ...LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
          ]}
        />
        <Select
          aria-label="Filter by date created"
          className="sm:w-[140px]"
          value={searchParams.get("created") ?? ALL}
          onValueChange={(v) => update("created", v)}
          options={[
            { value: ALL, label: "Any time" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
      </div>
      {active && (
        <Button
          variant="ghost"
          size="md"
          className="self-start lg:self-auto"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X aria-hidden /> Clear
        </Button>
      )}
    </div>
  );
}
