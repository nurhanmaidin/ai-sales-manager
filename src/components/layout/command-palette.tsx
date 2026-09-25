"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CornerDownLeft,
  FilePlus2,
  FileText,
  Loader2,
  Search,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";
import type { SearchResult } from "@/lib/search/service";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-items";

const OPEN_EVENT = "open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function SearchTrigger({ compact }: { compact?: boolean }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  if (compact) {
    return (
      <button
        onClick={openCommandPalette}
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="size-4" />
      </button>
    );
  }
  return (
    <button
      onClick={openCommandPalette}
      className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-subtle shadow-xs transition-colors hover:border-foreground/15 hover:text-muted-foreground"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <span className="flex gap-0.5" aria-hidden>
        <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

const RESULT_ICONS = { lead: Users, customer: UserRound, quotation: FileText } as const;
const RESULT_GROUPS = [
  { type: "lead", heading: "Leads" },
  { type: "customer", heading: "Customers" },
  { type: "quotation", heading: "Quotations" },
] as const;

const itemClass =
  "flex cursor-default select-none items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground outline-none data-[selected=true]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setFailed(false);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { results: SearchResult[] };
        if (id === requestId.current) {
          setResults(body.results);
          setFailed(false);
        }
      } catch {
        if (id === requestId.current) setFailed(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const hasQuery = query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="top-[12vh] max-w-xl translate-y-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <Command shouldFilter={!hasQuery} loop className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b px-4">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <Search className="size-4 text-muted-foreground" aria-hidden />
            )}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search leads, customers, quotations…"
              className="h-12 flex-1 bg-transparent text-md outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-subtle"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {hasQuery && !loading && (
              <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
                {failed
                  ? "Search is unavailable right now. Please try again."
                  : `No results for “${query.trim()}”`}
              </Command.Empty>
            )}

            {hasQuery &&
              RESULT_GROUPS.map(({ type, heading }) => {
                const items = results.filter((r) => r.type === type);
                if (items.length === 0) return null;
                const Icon = RESULT_ICONS[type];
                return (
                  <Command.Group key={type} heading={heading} className={groupClass}>
                    {items.map((r) => (
                      <Command.Item
                        key={r.id}
                        value={`${r.type}-${r.id}`}
                        onSelect={() => go(r.href)}
                        className={itemClass}
                      >
                        <Icon aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{r.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                        </div>
                        <CornerDownLeft
                          className="opacity-0 [[data-selected=true]_&]:opacity-100"
                          aria-hidden
                        />
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}

            {!hasQuery && (
              <>
                <Command.Group heading="Quick actions" className={groupClass}>
                  <Command.Item className={itemClass} onSelect={() => go("/leads?new=1")}>
                    <UserPlus aria-hidden /> Add a new lead
                  </Command.Item>
                  <Command.Item className={itemClass} onSelect={() => go("/quotations/new")}>
                    <FilePlus2 aria-hidden /> Create a quotation
                  </Command.Item>
                </Command.Group>
                <Command.Group heading="Go to" className={groupClass}>
                  {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
                    <Command.Item
                      key={item.href}
                      className={itemClass}
                      onSelect={() => go(item.href)}
                    >
                      <item.icon aria-hidden /> {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>
          <div
            className={cn(
              "flex items-center gap-4 border-t bg-canvas px-4 py-2 text-xs text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> to open
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const groupClass =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle";
