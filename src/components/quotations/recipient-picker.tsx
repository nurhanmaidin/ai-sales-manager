"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, UserRound, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";

export interface RecipientOption {
  key: string; // "customer:<id>" | "lead:<id>"
  kind: "customer" | "lead";
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export function RecipientPicker({
  id,
  value,
  onChange,
  options,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (key: string) => void;
  options: RecipientOption[];
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  const groups = [
    { kind: "customer" as const, heading: "Customers", icon: UserRound },
    { kind: "lead" as const, heading: "Leads", icon: Users },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          data-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex h-auto min-h-9 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid=true]:border-destructive"
          )}
        >
          {selected ? (
            <span className="min-w-0">
              <span className="block truncate text-base font-medium">{selected.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {selected.kind === "customer" ? "Customer" : "Lead"}
                {selected.company ? ` · ${selected.company}` : ""}
                {selected.phone ? ` · ${selected.phone}` : ""}
              </span>
            </span>
          ) : (
            <span className="text-base text-subtle">Choose a customer or lead…</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0">
        <Command loop>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <Command.Input
              placeholder="Search by name or company…"
              className="h-10 flex-1 bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-subtle"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches.
            </Command.Empty>
            {groups.map(({ kind, heading, icon: Icon }) => {
              const items = options.filter((o) => o.kind === kind);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={kind}
                  heading={heading}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle"
                >
                  {items.map((o) => (
                    <Command.Item
                      key={o.key}
                      value={`${o.name} ${o.company ?? ""} ${o.key}`}
                      onSelect={() => {
                        onChange(o.key);
                        setOpen(false);
                      }}
                      className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-accent"
                    >
                      <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{o.name}</span>
                        {o.company && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {o.company}
                          </span>
                        )}
                      </span>
                      {o.key === value && <Check className="size-4 text-primary" aria-hidden />}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
