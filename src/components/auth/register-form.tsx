"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/field";
import { InlineError } from "@/components/ui/states";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { registerAction } from "@/server/auth-actions";

export function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result && !result.ok) {
        setError(result.error);
        for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
          setFieldError(key as keyof RegisterInput, { message });
        }
      }
    });
  });

  const passwordHint = "At least 8 characters, with a letter and a number.";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <InlineError title={error} />}
      <Field label="Full name" htmlFor="name" error={errors.name?.message}>
        <Input
          {...fieldAria("name", errors.name?.message)}
          autoComplete="name"
          placeholder="Aisyah Rahman"
          autoFocus
          {...register("name")}
        />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email?.message}>
        <Input
          {...fieldAria("email", errors.email?.message)}
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register("email")}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint={passwordHint}
      >
        <Input
          {...fieldAria("password", errors.password?.message, passwordHint)}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...register("password")}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-xs text-subtle">
        By creating an account you agree to keep your customer data accurate and lawful under PDPA.
      </p>
    </form>
  );
}
