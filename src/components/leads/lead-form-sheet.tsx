"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { addDays, setHours, setMinutes } from "date-fns";
import type { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Field, FormSection, fieldAria } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/overlays";
import { MoneyInput, Segmented } from "@/components/ui/controls";
import { toDateTimeLocal } from "@/lib/utils/dates";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_META,
  PRIORITY_META,
  SOURCE_LABELS,
} from "@/lib/constants";
import { currencySymbol } from "@/lib/utils/format";
import { leadInputSchema } from "@/lib/validators/crm";
import { createLeadAction, updateLeadAction } from "@/server/crm-actions";

export interface LeadFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  description: string;
  estimatedValue: string;
  status: LeadStatus;
  priority: LeadPriority;
  scheduleFollowUp: boolean;
  nextFollowUpAt: string;
  followUpTask: string;
}

function defaultFollowUp() {
  return toDateTimeLocal(setMinutes(setHours(addDays(new Date(), 1), 10), 0));
}

const EMPTY: LeadFormValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "WHATSAPP",
  description: "",
  estimatedValue: "",
  status: "NEW",
  priority: "MEDIUM",
  scheduleFollowUp: true,
  nextFollowUpAt: "",
  followUpTask: "",
};

export function LeadFormSheet({
  open,
  onOpenChange,
  lead,
  currency = "MYR",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save, before the sheet closes. */
  onSaved?: () => void;
  /** When provided, the form edits this lead. */
  lead?: { id: string } & Partial<LeadFormValues>;
  currency?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(lead);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      setFormError(null);
      reset({ ...EMPTY, nextFollowUpAt: defaultFollowUp(), ...lead });
    }
  }, [open, lead, reset]);

  const scheduleFollowUp = watch("scheduleFollowUp");

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const payload = {
      ...values,
      nextFollowUpAt:
        !isEdit && values.scheduleFollowUp && values.nextFollowUpAt
          ? new Date(values.nextFollowUpAt).toISOString()
          : null,
      followUpTask: values.followUpTask || null,
    };

    // Client-side validation mirrors the server schema for instant feedback.
    const parsed = leadInputSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof LeadFormValues, { message: issue.message });
      }
      return;
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateLeadAction(lead!.id, payload)
        : await createLeadAction(payload);
      if (!result.ok) {
        setFormError(result.error);
        for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(key as keyof LeadFormValues, { message });
        }
        return;
      }
      onSaved?.();
      onOpenChange(false);
      if (isEdit) {
        toast.success("Lead updated");
        router.refresh();
      } else {
        toast.success("Lead added", {
          description: "Next: generate an AI reply to their enquiry.",
        });
        router.push(`/leads/${result.data.id}`);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <SheetContent aria-describedby={undefined} className="sm:max-w-[560px]">
        <form onSubmit={onSubmit} className="flex h-full flex-col" noValidate>
          <div className="border-b px-6 py-5">
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Edit lead" : "Add a lead"}
            </DialogTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEdit
                ? "Update the customer and opportunity details."
                : "Only the name is required — you can fill in the rest later."}
            </p>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {formError && (
              <p
                role="alert"
                className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <FormSection title="Customer" description="Who is enquiring?">
              <Field label="Name" htmlFor="lead-name" error={errors.name?.message}>
                <Input
                  {...fieldAria("lead-name", errors.name?.message)}
                  placeholder="e.g. Tan Wei Ming"
                  autoFocus={!isEdit}
                  {...register("name")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="lead-phone" error={errors.phone?.message} optional>
                  <Input
                    {...fieldAria("lead-phone", errors.phone?.message)}
                    type="tel"
                    placeholder="+60 12-345 6789"
                    {...register("phone")}
                  />
                </Field>
                <Field label="Email" htmlFor="lead-email" error={errors.email?.message} optional>
                  <Input
                    {...fieldAria("lead-email", errors.email?.message)}
                    type="email"
                    placeholder="name@email.com"
                    {...register("email")}
                  />
                </Field>
              </div>
              <Field
                label="Company"
                htmlFor="lead-company"
                error={errors.company?.message}
                optional
              >
                <Input
                  id="lead-company"
                  placeholder="If they're buying for a business"
                  {...register("company")}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Opportunity"
              description="What do they need, and how valuable is it?"
            >
              <Field
                label="Enquiry"
                htmlFor="lead-description"
                hint="Paste their message — AI uses it to draft your reply."
                optional
              >
                <Textarea
                  {...fieldAria("lead-description", undefined, "hint")}
                  rows={4}
                  placeholder="e.g. Hi, I'd like a quote to renovate my kitchen, around 120 sqft. Budget about RM25,000."
                  {...register("description")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source" htmlFor="lead-source">
                  <Controller
                    control={control}
                    name="source"
                    render={({ field }) => (
                      <Select
                        id="lead-source"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
                      />
                    )}
                  />
                </Field>
                <Field
                  label="Estimated value"
                  htmlFor="lead-value"
                  error={errors.estimatedValue?.message}
                  optional
                >
                  <MoneyInput
                    symbol={currencySymbol(currency)}
                    {...fieldAria("lead-value", errors.estimatedValue?.message)}
                    placeholder="0.00"
                    {...register("estimatedValue")}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status" htmlFor="lead-status">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        id="lead-status"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={LEAD_STATUSES.map((s) => ({
                          value: s,
                          label: LEAD_STATUS_META[s].label,
                        }))}
                      />
                    )}
                  />
                </Field>
                <Field label="Priority" htmlFor="lead-priority">
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Segmented
                        id="lead-priority"
                        aria-label="Priority"
                        value={field.value}
                        onChange={field.onChange}
                        options={(["LOW", "MEDIUM", "HIGH"] as const).map((p) => ({
                          value: p,
                          label: PRIORITY_META[p].label,
                        }))}
                      />
                    )}
                  />
                </Field>
              </div>
            </FormSection>

            {!isEdit && (
              <FormSection
                title="Follow-up"
                description="Set a reminder so this lead never goes cold."
              >
                <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <label htmlFor="lead-schedule" className="text-sm">
                    <span className="font-medium text-foreground">Schedule a follow-up</span>
                    <span className="block text-muted-foreground">
                      We&apos;ll remind you on the dashboard.
                    </span>
                  </label>
                  <Controller
                    control={control}
                    name="scheduleFollowUp"
                    render={({ field }) => (
                      <Switch
                        id="lead-schedule"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                {scheduleFollowUp && (
                  <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
                    <Field
                      label="When"
                      htmlFor="lead-followup-date"
                      error={errors.nextFollowUpAt?.message}
                    >
                      <Input
                        {...fieldAria("lead-followup-date", errors.nextFollowUpAt?.message)}
                        type="datetime-local"
                        {...register("nextFollowUpAt")}
                      />
                    </Field>
                    <Field label="Task" htmlFor="lead-followup-task" optional>
                      <Input
                        id="lead-followup-task"
                        placeholder="Follow up on enquiry"
                        {...register("followUpTask")}
                      />
                    </Field>
                  </div>
                )}
              </FormSection>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t bg-canvas px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Add lead"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Dialog>
  );
}
