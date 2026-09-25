"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LeadFormSheet } from "./lead-form-sheet";

/** "+ Add lead" button. With `autoOpen`, it also opens for `?new=1` (command palette). */
export function AddLeadButton({
  currency,
  label = "Add lead",
  variant = "primary",
  size,
  autoOpen = false,
}: {
  currency: string;
  autoOpen?: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // After a successful save the sheet navigates to the new lead; don't race it with URL cleanup.
  const saved = useRef(false);

  useEffect(() => {
    if (autoOpen && searchParams.get("new") === "1") setOpen(true);
  }, [autoOpen, searchParams]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && autoOpen && !saved.current && searchParams.get("new")) {
      const params = new URLSearchParams(searchParams);
      params.delete("new");
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus aria-hidden /> {label}
      </Button>
      <LeadFormSheet
        open={open}
        onOpenChange={onOpenChange}
        currency={currency}
        onSaved={() => {
          saved.current = true;
        }}
      />
    </>
  );
}
