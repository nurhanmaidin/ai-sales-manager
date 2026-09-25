"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/overlays";
import { BUSINESS_TYPES, COUNTRIES, CURRENCIES } from "@/lib/constants";
import { organizationProfileSchema } from "@/lib/validators/organization";
import type { NotificationPrefs } from "@/lib/account/service";
import { updateOrganizationProfileAction } from "@/server/organization-actions";
import {
  changePasswordAction,
  testAIConnectionAction,
  updateAccountProfileAction,
  updateNotificationPrefsAction,
} from "@/server/settings-actions";

function FormFooter({
  pending,
  dirty,
  label = "Save changes",
}: {
  pending: boolean;
  dirty: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-end border-t pt-5">
      <Button type="submit" loading={pending} disabled={!dirty}>
        {label}
      </Button>
    </div>
  );
}

/* ----------------------------- Business profile ---------------------------- */

export interface BusinessProfileValues {
  name: string;
  businessType: string;
  ownerName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  registrationNumber: string;
  taxInfo: string;
  country: string;
  currency: string;
  description: string;
}

export function BusinessProfileForm({
  defaults,
  canEdit,
}: {
  defaults: BusinessProfileValues;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileValues>({ defaultValues: defaults });

  const onSubmit = handleSubmit((values) => {
    const parsed = organizationProfileSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(issue.path[0] as keyof BusinessProfileValues, { message: issue.message });
      return;
    }
    startTransition(async () => {
      const result = await updateOrganizationProfileAction(values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Business profile saved");
      reset(values);
      router.refresh();
    });
  });

  const text = (
    key: keyof BusinessProfileValues,
    label: string,
    opts: { optional?: boolean; placeholder?: string; type?: string; hint?: string } = {}
  ) => (
    <Field
      label={label}
      htmlFor={`bp-${key}`}
      error={errors[key]?.message}
      optional={opts.optional}
      hint={opts.hint}
    >
      <Input
        {...fieldAria(`bp-${key}`, errors[key]?.message, opts.hint)}
        type={opts.type}
        placeholder={opts.placeholder}
        disabled={!canEdit}
        {...register(key)}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("name", "Business name")}
        <Field label="Business type" htmlFor="bp-businessType" error={errors.businessType?.message}>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select
                id="bp-businessType"
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={!canEdit}
                options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
              />
            )}
          />
        </Field>
        {text("ownerName", "Owner name", { hint: "Appears in the signature area of quotations." })}
        {text("registrationNumber", "SSM registration no.", {
          optional: true,
          placeholder: "202301045678 (1512345-K)",
        })}
        {text("phone", "Phone", { type: "tel", placeholder: "+60 3-7890 1234" })}
        {text("email", "Email", { type: "email" })}
        {text("website", "Website", { optional: true, placeholder: "yourbusiness.my" })}
        {text("taxInfo", "SST registration", { optional: true, placeholder: "SST No. W10-…" })}
      </div>
      <Field label="Address" htmlFor="bp-address" optional hint="Shown on quotations.">
        <Textarea
          {...fieldAria("bp-address", undefined, "hint")}
          rows={2}
          disabled={!canEdit}
          {...register("address")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country" htmlFor="bp-country">
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select
                id="bp-country"
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canEdit}
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              />
            )}
          />
        </Field>
        <Field label="Currency" htmlFor="bp-currency" hint="Used for new quotations.">
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select
                id="bp-currency"
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canEdit}
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              />
            )}
          />
        </Field>
      </div>
      <Field
        label="About your business"
        htmlFor="bp-description"
        optional
        hint="Helps AI write replies that sound like you."
      >
        <Textarea
          {...fieldAria("bp-description", undefined, "hint")}
          rows={3}
          disabled={!canEdit}
          {...register("description")}
        />
      </Field>
      {canEdit ? (
        <FormFooter pending={pending} dirty={isDirty} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can change the business profile.
        </p>
      )}
    </form>
  );
}

/* --------------------------------- Account -------------------------------- */

export function AccountNameForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm({ defaultValues: { name } });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateAccountProfileAction(values);
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.error);
        return;
      }
      setError(null);
      toast.success("Profile updated");
      reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="acc-name" error={error ?? undefined}>
          <Input
            {...fieldAria("acc-name", error ?? undefined)}
            autoComplete="name"
            {...register("name")}
          />
        </Field>
        <Field label="Email" htmlFor="acc-email" hint="Your login email can't be changed yet.">
          <Input {...fieldAria("acc-email", undefined, "hint")} value={email} disabled readOnly />
        </Field>
      </div>
      <FormFooter pending={pending} dirty={isDirty} />
    </form>
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { currentPassword: result.error });
        return;
      }
      setErrors({});
      reset();
      toast.success("Password changed");
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword}>
          <Input
            {...fieldAria("pw-current", errors.currentPassword)}
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
        </Field>
        <Field label="New password" htmlFor="pw-new" error={errors.newPassword}>
          <Input
            {...fieldAria("pw-new", errors.newPassword)}
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirmPassword}>
          <Input
            {...fieldAria("pw-confirm", errors.confirmPassword)}
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </Field>
      </div>
      <FormFooter pending={pending} dirty={isDirty} label="Change password" />
    </form>
  );
}

/* ------------------------------ Notifications ----------------------------- */

const NOTIFICATION_OPTIONS: { key: keyof NotificationPrefs; title: string; description: string }[] =
  [
    {
      key: "navBadge",
      title: "Follow-up count in navigation",
      description: "Show how many follow-ups are due or overdue next to Follow-ups.",
    },
    {
      key: "overdueBanner",
      title: "Overdue reminder",
      description: "Remind you about overdue follow-ups at the top of Today's list.",
    },
    {
      key: "dashboardInsights",
      title: "AI insights on dashboard",
      description: "Show AI-generated observations about your pipeline.",
    },
  ];

export function NotificationsForm({ prefs }: { prefs: NotificationPrefs }) {
  const router = useRouter();
  const [values, setValues] = useState(prefs);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function toggle(key: keyof NotificationPrefs, checked: boolean) {
    const next = { ...values, [key]: checked };
    setValues(next);
    setSavingKey(key);
    const result = await updateNotificationPrefsAction(next);
    setSavingKey(null);
    if (!result.ok) {
      setValues(values);
      toast.error(result.error);
      return;
    }
    toast.success("Preference saved");
    router.refresh();
  }

  return (
    <ul className="divide-y rounded-lg border">
      {NOTIFICATION_OPTIONS.map((o) => (
        <li key={o.key} className="flex items-center justify-between gap-6 px-4 py-4">
          <label htmlFor={`pref-${o.key}`} className="cursor-pointer">
            <span className="block text-sm font-medium">{o.title}</span>
            <span className="block text-sm text-muted-foreground">{o.description}</span>
          </label>
          <Switch
            id={`pref-${o.key}`}
            checked={values[o.key]}
            disabled={savingKey !== null}
            onCheckedChange={(c) => toggle(o.key, c)}
          />
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- AI ----------------------------------- */

export function AITestButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ provider: string; ms: number; sample: string } | null>(
    null
  );

  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await testAIConnectionAction();
            if (!res.ok) return void toast.error(res.error);
            setResult(res.data);
          })
        }
      >
        {!pending && <PlayCircle aria-hidden />} Run a test
      </Button>
      {result && (
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-success/20 bg-success-soft/60 px-4 py-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium">AI is working · responded in {result.ms} ms</p>
            <p className="mt-0.5 text-muted-foreground">“{result.sample}”</p>
          </div>
        </div>
      )}
    </div>
  );
}
