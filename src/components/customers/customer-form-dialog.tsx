"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { customerInputSchema } from "@/lib/validators/crm";
import { createCustomerAction, updateCustomerAction } from "@/server/crm-actions";

export interface CustomerFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY: CustomerFormValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export function CustomerFormButton({
  customer,
  label,
  variant,
  size,
}: {
  customer?: { id: string } & CustomerFormValues;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const isEdit = Boolean(customer);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    if (open) reset(customer ? { ...EMPTY, ...customer } : EMPTY);
  }, [open, customer, reset]);

  const onSubmit = handleSubmit((values) => {
    const parsed = customerInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof CustomerFormValues, { message: issue.message });
      }
      return;
    }
    startTransition(async () => {
      const result = isEdit
        ? await updateCustomerAction(customer!.id, values)
        : await createCustomerAction(values);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      toast.success(isEdit ? "Customer updated" : "Customer added");
      if (isEdit) router.refresh();
      else router.push(`/customers/${result.data.id}`);
    });
  });

  return (
    <>
      <Button
        variant={variant ?? (isEdit ? "secondary" : "primary")}
        size={size}
        onClick={() => setOpen(true)}
      >
        {isEdit ? <Pencil aria-hidden /> : <Plus aria-hidden />}
        {label ?? (isEdit ? "Edit" : "Add customer")}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="max-w-xl">
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader
              title={isEdit ? "Edit customer" : "Add a customer"}
              description={
                isEdit
                  ? undefined
                  : "For existing customers. New enquiries are best added as leads."
              }
            />
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="c-name" error={errors.name?.message}>
                  <Input
                    {...fieldAria("c-name", errors.name?.message)}
                    autoFocus
                    {...register("name")}
                  />
                </Field>
                <Field label="Company" htmlFor="c-company" optional>
                  <Input id="c-company" {...register("company")} />
                </Field>
                <Field label="Phone" htmlFor="c-phone" error={errors.phone?.message} optional>
                  <Input
                    {...fieldAria("c-phone", errors.phone?.message)}
                    type="tel"
                    placeholder="+60 12-345 6789"
                    {...register("phone")}
                  />
                </Field>
                <Field label="Email" htmlFor="c-email" error={errors.email?.message} optional>
                  <Input
                    {...fieldAria("c-email", errors.email?.message)}
                    type="email"
                    {...register("email")}
                  />
                </Field>
              </div>
              <Field label="Address" htmlFor="c-address" optional hint="Shown on quotations.">
                <Textarea
                  {...fieldAria("c-address", undefined, "hint")}
                  rows={2}
                  {...register("address")}
                />
              </Field>
              <Field label="Profile notes" htmlFor="c-notes" optional>
                <Textarea
                  id="c-notes"
                  rows={3}
                  placeholder="Preferences, payment terms, anything to remember"
                  {...register("notes")}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? "Save changes" : "Add customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
