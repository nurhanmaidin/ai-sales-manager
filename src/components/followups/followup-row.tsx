"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FollowUpStatus, LeadPriority } from "@prisma/client";
import {
  AlarmClock,
  Check,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityIndicator } from "@/components/crm/badges";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDue, formatRelative } from "@/lib/utils/format";
import {
  completeFollowUpAction,
  deleteFollowUpAction,
  reopenFollowUpAction,
  snoozeFollowUpAction,
} from "@/server/crm-actions";
import { FollowUpDialog } from "./followup-dialog";

export interface FollowUpRowData {
  id: string;
  task: string;
  dueDate: string;
  priority: LeadPriority;
  status: FollowUpStatus;
  completedAt: string | null;
  contact: { name: string; href: string; detail?: string | null } | null;
}

const SNOOZE_OPTIONS = [
  { preset: "1h", label: "1 hour" },
  { preset: "tomorrow", label: "Tomorrow morning" },
  { preset: "3d", label: "3 days" },
  { preset: "1w", label: "1 week" },
] as const;

export function FollowUpRow({
  item,
  showContact = true,
  dense,
}: {
  item: FollowUpRowData;
  showContact?: boolean;
  dense?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const completed = item.status === "COMPLETED";
  const due = new Date(item.dueDate);
  const overdue = !completed && due.getTime() < new Date().setHours(0, 0, 0, 0);

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    undo?: () => Promise<unknown>
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(
        success,
        undo
          ? { action: { label: "Undo", onClick: () => void undo().then(() => router.refresh()) } }
          : undefined
      );
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 transition-opacity",
        dense ? "py-2.5" : "px-4 py-3.5",
        pending && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() =>
          completed
            ? run(() => reopenFollowUpAction(item.id), "Follow-up reopened")
            : run(
                () => completeFollowUpAction(item.id),
                "Follow-up completed",
                () => reopenFollowUpAction(item.id)
              )
        }
        disabled={pending}
        aria-label={completed ? `Reopen: ${item.task}` : `Mark complete: ${item.task}`}
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
          completed
            ? "border-success bg-success text-white"
            : "border-input hover:border-success hover:bg-success-soft [&:hover_svg]:opacity-100"
        )}
      >
        <Check
          className={cn("size-3", completed ? "opacity-100" : "text-success opacity-0")}
          strokeWidth={3}
          aria-hidden
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-5",
            completed ? "text-muted-foreground line-through decoration-subtle" : "text-foreground"
          )}
        >
          {item.task}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {showContact && item.contact && (
            <>
              <Link
                href={item.contact.href}
                className="font-medium text-foreground/80 hover:text-primary hover:underline"
              >
                {item.contact.name}
              </Link>
              <span aria-hidden className="text-subtle">
                ·
              </span>
            </>
          )}
          {completed ? (
            <span>Completed {item.completedAt ? formatRelative(item.completedAt) : ""}</span>
          ) : (
            <time
              dateTime={item.dueDate}
              title={formatDateTime(item.dueDate)}
              className={cn(overdue && "font-medium text-warning")}
            >
              {overdue && <AlarmClock className="-mt-px mr-1 inline size-3" aria-hidden />}
              {formatDue(due)}
            </time>
          )}
          {item.status === "SNOOZED" && !completed && (
            <span className="rounded bg-muted px-1.5 text-2xs font-medium">Snoozed</span>
          )}
        </div>
      </div>

      {!dense && (
        <div className="hidden pt-0.5 sm:block">
          <PriorityIndicator priority={item.priority} showLabel={false} />
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-my-1 size-7 shrink-0"
            aria-label={`Actions for ${item.task}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!completed && (
            <>
              <DropdownMenuLabel>Snooze until</DropdownMenuLabel>
              {SNOOZE_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.preset}
                  onSelect={() =>
                    run(
                      () => snoozeFollowUpAction(item.id, { preset: o.preset }),
                      `Snoozed for ${o.label.toLowerCase()}`
                    )
                  }
                >
                  <AlarmClock /> {o.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
            </>
          )}
          {completed && (
            <DropdownMenuItem
              onSelect={() => run(() => reopenFollowUpAction(item.id), "Follow-up reopened")}
            >
              <RotateCcw /> Reopen
            </DropdownMenuItem>
          )}
          {item.contact && (
            <DropdownMenuItem asChild>
              <Link href={item.contact.href}>
                <ExternalLink /> Open {item.contact.href.startsWith("/leads") ? "lead" : "customer"}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => run(() => deleteFollowUpAction(item.id), "Follow-up deleted")}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FollowUpDialog
        open={editing}
        onOpenChange={setEditing}
        followUp={{ id: item.id, task: item.task, dueDate: item.dueDate, priority: item.priority }}
      />
    </div>
  );
}
