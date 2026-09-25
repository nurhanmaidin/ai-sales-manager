"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/context";
import { customerService } from "@/lib/customers/service";
import { followUpService } from "@/lib/followups/service";
import { leadService } from "@/lib/leads/service";
import { noteService } from "@/lib/notes/service";
import { runAction } from "./action";

function revalidateCrm(...paths: (string | null | undefined)[]) {
  for (const p of ["/dashboard", "/leads", "/customers", "/followups", ...paths]) {
    if (p) revalidatePath(p);
  }
  revalidatePath("/", "layout");
}

/* ---------------------------------- Leads --------------------------------- */

export async function createLeadAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const lead = await leadService.create(ctx, input);
    revalidateCrm();
    return { id: lead.id };
  });
}

export async function updateLeadAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const lead = await leadService.update(ctx, id, input);
    revalidateCrm(`/leads/${lead.id}`);
    return { id: lead.id };
  });
}

export async function changeLeadStatusAction(id: string, status: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const lead = await leadService.changeStatus(ctx, id, status);
    revalidateCrm(`/leads/${lead.id}`);
    return { id: lead.id, status: lead.status, convertedCustomerId: lead.convertedCustomerId };
  });
}

export async function deleteLeadAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    await leadService.remove(ctx, id);
    revalidateCrm();
  });
}

export async function convertLeadAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const customer = await leadService.convertToCustomer(ctx, id);
    revalidateCrm(`/leads/${id}`, `/customers/${customer.id}`);
    return { customerId: customer.id };
  });
}

/* -------------------------------- Customers ------------------------------- */

export async function createCustomerAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const customer = await customerService.create(ctx, input);
    revalidateCrm();
    return { id: customer.id };
  });
}

export async function updateCustomerAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const customer = await customerService.update(ctx, id, input);
    revalidateCrm(`/customers/${customer.id}`);
    return { id: customer.id };
  });
}

/* ---------------------------------- Notes --------------------------------- */

export async function addNoteAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const note = await noteService.create(ctx, input);
    revalidateCrm(
      note.leadId && `/leads/${note.leadId}`,
      note.customerId && `/customers/${note.customerId}`
    );
    return { id: note.id };
  });
}

export async function deleteNoteAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const note = await noteService.remove(ctx, id);
    revalidateCrm(
      note.leadId && `/leads/${note.leadId}`,
      note.customerId && `/customers/${note.customerId}`
    );
  });
}

/* -------------------------------- Follow-ups ------------------------------ */

export async function createFollowUpAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.create(ctx, input);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
    return { id: f.id };
  });
}

export async function updateFollowUpAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.update(ctx, id, input);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
  });
}

export async function completeFollowUpAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.complete(ctx, id);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
  });
}

export async function reopenFollowUpAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.reopen(ctx, id);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
  });
}

export async function snoozeFollowUpAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.snooze(ctx, id, input);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
    return { dueDate: f.dueDate.toISOString() };
  });
}

export async function deleteFollowUpAction(id: string) {
  return runAction(async () => {
    const ctx = await requireTenant();
    const f = await followUpService.remove(ctx, id);
    revalidateCrm(f.leadId && `/leads/${f.leadId}`, f.customerId && `/customers/${f.customerId}`);
  });
}
