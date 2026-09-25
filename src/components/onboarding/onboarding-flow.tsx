"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Briefcase,
  Check,
  Code2,
  Hammer,
  Megaphone,
  MoreHorizontal,
  Sofa,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fieldAria } from "@/components/ui/field";
import { BUSINESS_TYPES, COUNTRIES, CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { onboardingSchema, type OnboardingInput } from "@/lib/validators/organization";
import { completeOnboardingAction } from "@/server/organization-actions";

type FieldKey = keyof OnboardingInput;

const BUSINESS_TYPE_ICONS: Record<(typeof BUSINESS_TYPES)[number], LucideIcon> = {
  "Renovation & Construction": Hammer,
  "Interior Design": Sofa,
  "Creative / Marketing Agency": Megaphone,
  "Wholesale & Distribution": Boxes,
  "Professional Services": Briefcase,
  "IT & Software Services": Code2,
  "Freelancer / Consultant": User,
  "Events & Catering": UtensilsCrossed,
  Other: MoreHorizontal,
};

const STEPS: { field: FieldKey; label: string; title: string; subtitle: string }[] = [
  {
    field: "name",
    label: "Business",
    title: "What's your business called?",
    subtitle: "This appears on your quotations and customer messages.",
  },
  {
    field: "businessType",
    label: "Type",
    title: "What kind of business do you run?",
    subtitle: "We'll tailor AI replies and quotation wording to your industry.",
  },
  {
    field: "ownerName",
    label: "Owner",
    title: "Who owns the business?",
    subtitle: "Used for signatures on quotations and replies.",
  },
  {
    field: "phone",
    label: "Phone",
    title: "What's your business phone number?",
    subtitle: "Customers will see this on your quotations.",
  },
  {
    field: "email",
    label: "Email",
    title: "Which email should customers reach you at?",
    subtitle: "Shown on quotations. You can change it anytime.",
  },
  {
    field: "country",
    label: "Country",
    title: "Where is your business based?",
    subtitle: "Helps us format dates, phone numbers and tax.",
  },
  {
    field: "currency",
    label: "Currency",
    title: "Which currency do you quote in?",
    subtitle: "All values and quotations will use this currency.",
  },
  {
    field: "description",
    label: "About",
    title: "Describe what you do in a sentence or two.",
    subtitle: "Optional, but it helps AI write replies that sound like you.",
  },
];

export function OnboardingFlow({ defaults }: { defaults: OnboardingInput }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;
  const error = errors[step.field]?.message;

  async function next(e?: React.FormEvent) {
    e?.preventDefault();
    const valid = await trigger(step.field);
    if (!valid) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    startTransition(async () => {
      const result = await completeOnboardingAction(getValues());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Your workspace is ready");
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {stepIndex + 1} <span className="text-subtle">of {STEPS.length}</span>
          </span>
          <span className="text-muted-foreground">{step.label}</span>
        </div>
        <ol className="flex gap-1.5" aria-label="Onboarding progress">
          {STEPS.map((s, i) => (
            <li key={s.field} className="flex-1">
              <span className="sr-only">
                {s.label}: {i < stepIndex ? "completed" : i === stepIndex ? "current" : "upcoming"}
              </span>
              <span
                aria-hidden
                className={cn(
                  "block h-1 rounded-full transition-colors duration-300",
                  i < stepIndex ? "bg-primary" : i === stepIndex ? "bg-primary/60" : "bg-border"
                )}
              />
            </li>
          ))}
        </ol>
      </div>

      <form
        onSubmit={next}
        className="rounded-2xl border bg-background p-6 shadow-card sm:p-10"
        noValidate
      >
        <div key={step.field} className="animate-fade-up">
          <label htmlFor={step.field} className="block text-2xl font-semibold tracking-tight">
            {step.title}
          </label>
          <p className="mt-2 text-md text-muted-foreground">{step.subtitle}</p>

          <div className="mt-8">
            {step.field === "businessType" ? (
              <Controller
                control={control}
                name="businessType"
                render={({ field }) => (
                  <div
                    role="radiogroup"
                    aria-labelledby={step.field}
                    id={step.field}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {BUSINESS_TYPES.map((type) => {
                      const Icon = BUSINESS_TYPE_ICONS[type];
                      const selected = field.value === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(type)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-foreground/20 hover:bg-accent/50",
                            selected &&
                              "border-primary bg-primary-soft text-primary hover:border-primary hover:bg-primary-soft"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              selected ? "text-primary" : "text-muted-foreground"
                            )}
                            aria-hidden
                          />
                          <span className="flex-1">{type}</span>
                          {selected && <Check className="size-4 text-primary" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            ) : step.field === "country" ? (
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select
                    {...fieldAria("country", error)}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    className="h-11 text-md"
                  />
                )}
              />
            ) : step.field === "currency" ? (
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    {...fieldAria("currency", error)}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                    className="h-11 text-md"
                  />
                )}
              />
            ) : step.field === "description" ? (
              <Textarea
                {...fieldAria("description", error)}
                rows={4}
                autoFocus
                placeholder="e.g. We design and renovate kitchens, bathrooms and full homes across the Klang Valley."
                className="text-md"
                {...register("description")}
              />
            ) : (
              <Input
                {...fieldAria(step.field, error)}
                autoFocus
                className="h-11 text-md"
                type={step.field === "email" ? "email" : step.field === "phone" ? "tel" : "text"}
                autoComplete={
                  step.field === "email"
                    ? "email"
                    : step.field === "phone"
                      ? "tel"
                      : step.field === "ownerName"
                        ? "name"
                        : "organization"
                }
                placeholder={
                  step.field === "name"
                    ? "e.g. BrightBuild Renovation"
                    : step.field === "phone"
                      ? "+60 12-345 6789"
                      : step.field === "email"
                        ? "hello@yourbusiness.com"
                        : "Full name"
                }
                {...register(step.field)}
              />
            )}
            {error && (
              <p id={`${step.field}-error`} role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0 || pending}
            className={cn(stepIndex === 0 && "invisible")}
          >
            <ArrowLeft aria-hidden /> Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-subtle sm:inline">
              or press <kbd className="font-sans font-medium text-muted-foreground">Enter</kbd>
            </span>
            <Button type="submit" size="lg" loading={pending}>
              {isLast ? "Finish setup" : "Continue"}
              {!pending && !isLast && <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
