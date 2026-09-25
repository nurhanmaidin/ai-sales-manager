"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import {
  ArrowRightLeft,
  Check,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEAD_STATUSES, LEAD_STATUS_META } from "@/lib/constants";
import { changeLeadStatusAction, convertLeadAction, deleteLeadAction } from "@/server/crm-actions";
import { LeadFormSheet, type LeadFormValues } from "./lead-form-sheet";

export function LeadActions({
  lead,
  currency,
}: {
  lead: {
    id: string;
    name: string;
    status: LeadStatus;
    convertedCustomerId: string | null;
  } & Partial<LeadFormValues>;
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLost, setConfirmLost] = useState(false);
  const [, startTransition] = useTransition();

  function setStatus(status: LeadStatus) {
    startTransition(async () => {
      const result = await changeLeadStatusAction(lead.id, status);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Moved to ${LEAD_STATUS_META[status].label}`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => setEditing(true)}>
        <Pencil aria-hidden /> Edit
      </Button>
      <Button asChild>
        <Link href={`/quotations/new?leadId=${lead.id}`}>
          <FilePlus2 aria-hidden /> Create quotation
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
          {LEAD_STATUSES.filter((s) => s !== lead.status && s !== "LOST").map((s) => (
            <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
              <ArrowRightLeft /> {LEAD_STATUS_META[s].label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {lead.status === "WON" && !lead.convertedCustomerId && (
            <ConvertMenuItem leadId={lead.id} />
          )}
          {lead.status !== "LOST" && (
            <DropdownMenuItem onSelect={() => setConfirmLost(true)}>
              <XCircle /> Mark as lost
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
            <Trash2 /> Delete lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LeadFormSheet open={editing} onOpenChange={setEditing} lead={lead} currency={currency} />

      <ConfirmDialog
        open={confirmLost}
        onOpenChange={setConfirmLost}
        title="Mark this lead as lost?"
        description="It will leave your open pipeline. You can reopen it anytime by choosing a stage."
        confirmLabel="Mark as lost"
        onConfirm={async () => setStatus("LOST")}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Delete ${lead.name}?`}
        description="This permanently removes the lead with its notes, activity and follow-ups. Quotations are kept but unlinked. This can't be undone."
        confirmLabel="Delete lead"
        onConfirm={async () => {
          const result = await deleteLeadAction(lead.id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success("Lead deleted");
          router.push("/leads");
        }}
      />
    </div>
  );
}

function ConvertMenuItem({ leadId }: { leadId: string }) {
  const router = useRouter();
  return (
    <DropdownMenuItem
      onSelect={async () => {
        const result = await convertLeadAction(leadId);
        if (!result.ok) return void toast.error(result.error);
        toast.success("Converted to customer");
        router.push(`/customers/${result.data.customerId}`);
      }}
    >
      <UserCheck /> Convert to customer
    </DropdownMenuItem>
  );
}

/** Prominent prompt shown on WON leads that aren't customers yet. */
export function ConvertBanner({ leadId, name }: { leadId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-success/25 bg-success-soft px-5 py-4 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-success shadow-xs">
        <UserCheck className="size-4" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="font-medium text-foreground">Deal won — nice work.</p>
        <p className="text-sm text-muted-foreground">
          Convert {name} to a customer to keep their quotations, notes and history together.
        </p>
      </div>
      <Button onClick={() => setOpen(true)} className="bg-success hover:bg-success/90">
        Convert to customer
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Convert ${name} to a customer?`}
        description="A customer profile will be created from this lead's contact details."
        confirmLabel="Convert to customer"
        onConfirm={async () => {
          const result = await convertLeadAction(leadId);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success("Converted to customer", {
            description: "All history has been carried over.",
          });
          router.push(`/customers/${result.data.customerId}`);
        }}
      >
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {["Quotations", "Notes", "Activity timeline", "Open follow-ups"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-3.5 text-success" aria-hidden /> {item} carry over
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
