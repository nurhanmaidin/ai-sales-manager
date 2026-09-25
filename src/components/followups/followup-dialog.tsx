"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, setHours, setMinutes } from "date-fns";
import type { LeadPriority } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/controls";
import { toDateTimeLocal } from "@/lib/utils/dates";
import { PRIORITY_META } from "@/lib/constants";
import { createFollowUpAction, updateFollowUpAction } from "@/server/crm-actions";

export interface FollowUpTarget {
  value: string; // "lead:<id>" | "customer:<id>"
  label: string;
}

export interface EditableFollowUp {
  id: string;
  task: string;
  dueDate: string;
  priority: LeadPriority;
}

const QUICK_DATES = [
  {
    label: "Later today",
    get: () => setMinutes(setHours(new Date(), Math.min(new Date().getHours() + 2, 20)), 0),
  },
  { label: "Tomorrow", get: () => setMinutes(setHours(addDays(new Date(), 1), 10), 0) },
  { label: "In 3 days", get: () => setMinutes(setHours(addDays(new Date(), 3), 10), 0) },
  { label: "Next week", get: () => setMinutes(setHours(addDays(new Date(), 7), 10), 0) },
];

export function FollowUpDialog({
  open,
  onOpenChange,
  leadId,
  customerId,
  targets,
  followUp,
  defaultTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  customerId?: string;
  /** When no lead/customer is fixed, the user picks one of these. */
  targets?: FollowUpTarget[];
  followUp?: EditableFollowUp;
  defaultTask?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<LeadPriority>("MEDIUM");
  const [target, setTarget] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(followUp);
  const needsTarget = !isEdit && !leadId && !customerId;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTask(followUp?.task ?? defaultTask ?? "");
    setDue(toDateTimeLocal(followUp?.dueDate ?? QUICK_DATES[1]!.get()));
    setPriority(followUp?.priority ?? "MEDIUM");
    setTarget("");
  }, [open, followUp, defaultTask]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (task.trim().length < 2) nextErrors.task = "Describe the follow-up";
    if (!due) nextErrors.dueDate = "Choose a date and time";
    if (needsTarget && !target) nextErrors.target = "Choose who to follow up with";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const [kind, id] = target.split(":");
    const payload = {
      task,
      dueDate: new Date(due).toISOString(),
      priority,
      leadId: leadId ?? (kind === "lead" ? id : undefined),
      customerId: customerId ?? (kind === "customer" ? id : undefined),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateFollowUpAction(followUp!.id, payload)
        : await createFollowUpAction(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Follow-up updated" : "Follow-up scheduled");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader
            title={isEdit ? "Edit follow-up" : "Schedule a follow-up"}
            description={isEdit ? undefined : "We'll surface it on your dashboard when it's due."}
          />
          <DialogBody className="space-y-4">
            {needsTarget && (
              <Field label="Follow up with" htmlFor="fu-target" error={errors.target}>
                <Select
                  {...fieldAria("fu-target", errors.target)}
                  value={target || undefined}
                  onValueChange={setTarget}
                  placeholder="Choose a lead or customer"
                  options={targets ?? []}
                />
              </Field>
            )}
            <Field label="Task" htmlFor="fu-task" error={errors.task}>
              <Input
                {...fieldAria("fu-task", errors.task)}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g. Call to confirm site visit"
                autoFocus
              />
            </Field>
            <Field label="Due" htmlFor="fu-due" error={errors.dueDate}>
              <Input
                {...fieldAria("fu-due", errors.dueDate)}
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_DATES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setDue(toDateTimeLocal(q.get()))}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Priority" htmlFor="fu-priority">
              <Segmented
                id="fu-priority"
                aria-label="Priority"
                value={priority}
                onChange={setPriority}
                options={(["LOW", "MEDIUM", "HIGH"] as const).map((p) => ({
                  value: p,
                  label: PRIORITY_META[p].label,
                }))}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
