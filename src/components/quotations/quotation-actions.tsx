"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuotationStatus } from "@prisma/client";
import {
  CircleCheck,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Printer,
  Send,
  Timer,
  Trash2,
  Undo2,
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
import { QUOTATION_STATUS_META } from "@/lib/constants";
import {
  changeQuotationStatusAction,
  deleteQuotationAction,
  duplicateQuotationAction,
} from "@/server/quotation-actions";

const STATUS_ICONS: Record<QuotationStatus, React.ReactNode> = {
  DRAFT: <Undo2 />,
  SENT: <Send />,
  VIEWED: <Eye />,
  ACCEPTED: <CircleCheck />,
  REJECTED: <XCircle />,
  EXPIRED: <Timer />,
};

const PRIMARY_NEXT: Partial<Record<QuotationStatus, { status: QuotationStatus; label: string }>> = {
  DRAFT: { status: "SENT", label: "Mark as sent" },
  SENT: { status: "ACCEPTED", label: "Mark as accepted" },
  VIEWED: { status: "ACCEPTED", label: "Mark as accepted" },
};

export function QuotationActions({
  id,
  number,
  status,
  transitions,
  editable,
}: {
  id: string;
  number: string;
  status: QuotationStatus;
  transitions: QuotationStatus[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const primary = PRIMARY_NEXT[status];

  function setStatus(next: QuotationStatus) {
    startTransition(async () => {
      const result = await changeQuotationStatusAction(id, next);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${number} marked as ${QUOTATION_STATUS_META[next].label.toLowerCase()}`, {
        description: next === "ACCEPTED" ? "The linked lead has been moved to Won." : undefined,
      });
      router.refresh();
    });
  }

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateQuotationAction(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Duplicated as a new draft");
      router.push(`/quotations/${result.data.id}/edit`);
    });
  }

  const secondary = transitions.filter((t) => t !== primary?.status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={() => window.print()}>
        <Printer aria-hidden /> Print / PDF
      </Button>
      {editable && (
        <Button asChild variant="secondary">
          <Link href={`/quotations/${id}/edit`}>
            <Pencil aria-hidden /> Edit
          </Link>
        </Button>
      )}
      {primary && transitions.includes(primary.status) && (
        <Button onClick={() => setStatus(primary.status)} loading={pending}>
          {!pending && STATUS_ICONS[primary.status]} {primary.label}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            aria-label="More quotation actions"
            disabled={pending}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {secondary.length > 0 && (
            <>
              <DropdownMenuLabel>Update status</DropdownMenuLabel>
              {secondary.map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setStatus(t)}>
                  {STATUS_ICONS[t]}{" "}
                  {t === "DRAFT"
                    ? "Move back to draft"
                    : `Mark as ${QUOTATION_STATUS_META[t].label.toLowerCase()}`}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={duplicate}>
            <Copy /> Duplicate as new draft
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
            <Trash2 /> Delete quotation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Delete ${number}?`}
        description="The quotation and its line items will be permanently removed. This can't be undone."
        confirmLabel="Delete quotation"
        onConfirm={async () => {
          const result = await deleteQuotationAction(id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success("Quotation deleted");
          router.push("/quotations");
        }}
      />
    </div>
  );
}
