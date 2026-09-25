"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/overlays";
import { QUOTATION_UNITS } from "@/lib/constants";
import { calculateTotals } from "@/lib/quotations/calculations";
import { currencySymbol, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { quotationInputSchema } from "@/lib/validators/quotation";
import {
  createQuotationAction,
  suggestItemDescriptionAction,
  updateQuotationAction,
} from "@/server/quotation-actions";
import { FitToWidth } from "./fit-to-width";
import { QuotationDocument, type QuotationDocData } from "./quotation-document";
import { RecipientPicker, type RecipientOption } from "./recipient-picker";

export interface BuilderItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface BuilderValues {
  recipient: string;
  title: string;
  issueDate: string;
  expiryDate: string;
  items: BuilderItem[];
  discount: string;
  taxRate: string;
  notes: string;
  terms: string;
}

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const TAX_PRESETS = [
  { value: "0", label: "0%" },
  { value: "6", label: "6%" },
  { value: "8", label: "8%" },
];

export function QuotationBuilder({
  mode,
  quotationId,
  quotationNumber,
  status,
  defaults,
  recipients,
  business,
  currency,
}: {
  mode: "create" | "edit";
  quotationId?: string;
  quotationNumber?: string;
  status?: string;
  defaults: BuilderValues;
  recipients: RecipientOption[];
  business: QuotationDocData["business"];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState<"DRAFT" | "SENT" | null>(null);
  const [suggesting, setSuggesting] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { control, register, watch, handleSubmit, setValue, getValues } = useForm<BuilderValues>({
    defaultValues: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const values = watch();

  const totals = useMemo(
    () =>
      calculateTotals(
        values.items.map((i) => ({ quantity: num(i.quantity), unitPrice: num(i.unitPrice) })),
        num(values.discount),
        num(values.taxRate)
      ),
    [values.items, values.discount, values.taxRate]
  );

  const recipient = recipients.find((r) => r.key === values.recipient) ?? null;
  const symbol = currencySymbol(currency);

  const preview: QuotationDocData = {
    number: quotationNumber ?? null,
    title: values.title || null,
    issueDate: values.issueDate || new Date().toISOString(),
    expiryDate: values.expiryDate || null,
    currency,
    business,
    recipient,
    items: values.items.map((i, idx) => ({
      description: i.description,
      quantity: num(i.quantity),
      unit: i.unit,
      unitPrice: num(i.unitPrice),
      total: totals.lines[idx]?.total ?? 0,
    })),
    totals,
    notes: values.notes || null,
    terms: values.terms || null,
  };

  async function suggest(index: number) {
    const hint = getValues(`items.${index}.description`);
    setSuggesting(index);
    const result = await suggestItemDescriptionAction(hint);
    setSuggesting(null);
    if (!result.ok) return void toast.error(result.error);
    setValue(`items.${index}.description`, result.data, { shouldDirty: true });
  }

  const save = (target: "DRAFT" | "SENT") =>
    handleSubmit((v) => {
      const [kind, id] = v.recipient.split(":");
      const payload = {
        title: v.title,
        customerId: kind === "customer" ? id : null,
        leadId: kind === "lead" ? id : null,
        issueDate: v.issueDate,
        expiryDate: v.expiryDate || null,
        discount: v.discount || 0,
        taxRate: v.taxRate || 0,
        notes: v.notes,
        terms: v.terms,
        status: target,
        items: v.items.map((i) => ({
          ...i,
          quantity: i.quantity || 0,
          unitPrice: i.unitPrice || 0,
        })),
      };

      const parsed = quotationInputSchema.safeParse(payload);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
        toast.error("Please fix the highlighted fields.");
        return;
      }
      setErrors({});
      setSubmitting(target);
      startTransition(async () => {
        const result =
          mode === "edit"
            ? await updateQuotationAction(quotationId!, payload)
            : await createQuotationAction(payload);
        setSubmitting(null);
        if (!result.ok) {
          toast.error(result.error);
          if (result.fieldErrors) setErrors(result.fieldErrors);
          return;
        }
        toast.success(
          mode === "edit"
            ? "Quotation saved"
            : target === "SENT"
              ? `Quotation ${"quotationNumber" in result.data ? result.data.quotationNumber : ""} created and marked as sent`
              : "Draft saved"
        );
        router.push(`/quotations/${result.data.id}`);
        router.refresh();
      });
    })();

  const isDraft = mode === "create" || status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={mode === "edit" ? `/quotations/${quotationId}` : "/quotations"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />{" "}
            {mode === "edit" ? "Back to quotation" : "Quotations"}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {mode === "edit" ? `Edit ${quotationNumber}` : "New quotation"}
          </h1>
        </div>
        <div className="flex gap-2">
          {isDraft ? (
            <>
              <Button
                variant="secondary"
                onClick={() => save("DRAFT")}
                loading={submitting === "DRAFT"}
                disabled={pending}
              >
                Save draft
              </Button>
              <Button
                onClick={() => save("SENT")}
                loading={submitting === "SENT"}
                disabled={pending}
              >
                Save &amp; mark as sent
              </Button>
            </>
          ) : (
            <Button onClick={() => save("SENT")} loading={pending} disabled={pending}>
              Save changes
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Editor */}
        <form className="min-w-0 space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
          <Card className="space-y-5 p-5">
            <h2 className="text-md font-semibold">Customer &amp; details</h2>
            <Field label="Prepared for" htmlFor="q-recipient" error={errors.recipient}>
              <Controller
                control={control}
                name="recipient"
                render={({ field }) => (
                  <RecipientPicker
                    id="q-recipient"
                    value={field.value}
                    onChange={field.onChange}
                    options={recipients}
                    invalid={Boolean(errors.recipient)}
                    describedBy={errors.recipient ? "q-recipient-error" : undefined}
                  />
                )}
              />
            </Field>
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any leads or customers yet.{" "}
                <Link href="/leads?new=1" className="font-medium text-primary hover:underline">
                  Add a lead first
                </Link>
                .
              </p>
            )}
            <Field
              label="Title"
              htmlFor="q-title"
              optional
              hint="Shown as the heading, e.g. “Kitchen renovation — Mont Kiara”."
            >
              <Input
                {...fieldAria("q-title", undefined, "hint")}
                placeholder="What is this quotation for?"
                {...register("title")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Issue date" htmlFor="q-issue" error={errors.issueDate}>
                <Input
                  {...fieldAria("q-issue", errors.issueDate)}
                  type="date"
                  {...register("issueDate")}
                />
              </Field>
              <Field label="Valid until" htmlFor="q-expiry" error={errors.expiryDate} optional>
                <Input
                  {...fieldAria("q-expiry", errors.expiryDate)}
                  type="date"
                  {...register("expiryDate")}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-md font-semibold">Items</h2>
              <span className="text-sm text-muted-foreground">
                {fields.length} {fields.length === 1 ? "item" : "items"}
              </span>
            </div>
            {errors.items && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {errors.items}
              </p>
            )}

            <ol className="space-y-2.5">
              {fields.map((field, index) => {
                const descError = errors[`items.${index}.description`];
                const qtyError = errors[`items.${index}.quantity`];
                const priceError = errors[`items.${index}.unitPrice`];
                return (
                  <li
                    key={field.id}
                    className="rounded-lg border bg-background p-3 transition-colors focus-within:border-foreground/20"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="tabular mt-2 w-5 shrink-0 text-center text-xs font-medium text-subtle"
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <label htmlFor={`item-${index}-desc`} className="sr-only">
                          Item {index + 1} description
                        </label>
                        <Textarea
                          {...fieldAria(`item-${index}-desc`, descError)}
                          rows={1}
                          placeholder="Describe the work or product, e.g. Kitchen cabinets with soft-close"
                          className="min-h-9 resize-y py-1.5 pr-9 [field-sizing:content]"
                          {...register(`items.${index}.description`)}
                        />
                        <Tooltip content="Write a professional description with AI">
                          <button
                            type="button"
                            onClick={() => suggest(index)}
                            disabled={suggesting !== null}
                            aria-label={`Improve item ${index + 1} description with AI`}
                            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded text-subtle transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-50"
                          >
                            <Sparkles
                              className={cn(
                                "size-3.5",
                                suggesting === index && "animate-pulse text-primary"
                              )}
                            />
                          </button>
                        </Tooltip>
                        {descError && (
                          <p
                            id={`item-${index}-desc-error`}
                            className="mt-1 text-xs text-destructive"
                          >
                            {descError}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        aria-label={`Remove item ${index + 1}`}
                        className="shrink-0 text-subtle hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pl-[30px] sm:grid-cols-[76px_100px_minmax(0,1fr)_120px] sm:items-end">
                      <div>
                        <label
                          htmlFor={`item-${index}-qty`}
                          className="mb-1 block text-2xs font-medium text-muted-foreground"
                        >
                          Qty
                        </label>
                        <Input
                          {...fieldAria(`item-${index}-qty`, qtyError)}
                          inputMode="decimal"
                          className="tabular h-8 text-right"
                          {...register(`items.${index}.quantity`)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`item-${index}-unit`}
                          className="mb-1 block text-2xs font-medium text-muted-foreground"
                        >
                          Unit
                        </label>
                        <Controller
                          control={control}
                          name={`items.${index}.unit`}
                          render={({ field: f }) => (
                            <Select
                              id={`item-${index}-unit`}
                              size="sm"
                              value={f.value}
                              onValueChange={f.onChange}
                              options={[...new Set([...QUOTATION_UNITS, f.value])].map((u) => ({
                                value: u,
                                label: u,
                              }))}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`item-${index}-price`}
                          className="mb-1 block text-2xs font-medium text-muted-foreground"
                        >
                          Unit price
                        </label>
                        <MoneyInput
                          symbol={symbol}
                          {...fieldAria(`item-${index}-price`, priceError)}
                          className="h-8 text-right"
                          placeholder="0.00"
                          {...register(`items.${index}.unitPrice`)}
                        />
                      </div>
                      <div className="flex h-8 items-center justify-end pr-1">
                        <span className="tabular text-sm font-semibold">
                          {formatMoney(totals.lines[index]?.total ?? 0, currency)}
                        </span>
                      </div>
                    </div>
                    {(qtyError || priceError) && (
                      <p className="mt-1.5 pl-[30px] text-xs text-destructive">
                        {qtyError ?? priceError}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                append({ description: "", quantity: "1", unit: "unit", unitPrice: "" })
              }
            >
              <Plus aria-hidden /> Add item
            </Button>

            <div className="mt-6 grid gap-6 border-t pt-5 sm:grid-cols-2">
              <div className="space-y-4">
                <Field label="Discount" htmlFor="q-discount" error={errors.discount} optional>
                  <MoneyInput
                    symbol={symbol}
                    {...fieldAria("q-discount", errors.discount)}
                    placeholder="0.00"
                    {...register("discount")}
                  />
                </Field>
                <Field label="SST" htmlFor="q-tax" error={errors.taxRate}>
                  <div className="flex gap-2">
                    <div className="relative w-24">
                      <Input
                        {...fieldAria("q-tax", errors.taxRate)}
                        inputMode="decimal"
                        className="tabular pr-7 text-right"
                        {...register("taxRate")}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {TAX_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setValue("taxRate", p.value, { shouldDirty: true })}
                          className={cn(
                            "h-9 rounded-md border px-2.5 text-xs font-medium transition-colors",
                            num(values.taxRate) === Number(p.value)
                              ? "border-primary bg-primary-soft text-primary"
                              : "text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>
              </div>
              <dl className="space-y-2 self-end rounded-lg bg-canvas p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{formatMoney(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular">− {formatMoney(totals.discount, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SST ({totals.taxRate}%)</dt>
                  <dd className="tabular">{formatMoney(totals.tax, currency)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t pt-2">
                  <dt className="font-semibold">Total</dt>
                  <dd className="tabular text-lg font-semibold" data-testid="quotation-total">
                    {formatMoney(totals.total, currency)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="text-md font-semibold">Notes &amp; terms</h2>
            <Field label="Notes" htmlFor="q-notes" optional>
              <Textarea
                id="q-notes"
                rows={3}
                placeholder="e.g. Price includes materials, labour and site cleaning."
                {...register("notes")}
              />
            </Field>
            <Field label="Terms & conditions" htmlFor="q-terms" optional hint="One term per line.">
              <Textarea
                {...fieldAria("q-terms", undefined, "hint")}
                rows={4}
                {...register("terms")}
              />
            </Field>
          </Card>
        </form>

        {/* Live preview */}
        <div className="min-w-0">
          <div className="sticky top-6 space-y-2">
            <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Live preview</span>
              <span>A4</span>
            </p>
            <div className="rounded-xl border bg-canvas p-3 sm:p-4">
              <FitToWidth width={794}>
                <QuotationDocument data={preview} />
              </FitToWidth>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
