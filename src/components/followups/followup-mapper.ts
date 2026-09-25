import type { FollowUp } from "@prisma/client";
import type { FollowUpRowData } from "./followup-row";

type WithContact = FollowUp & {
  lead?: { id: string; name: string; company: string | null; phone?: string | null } | null;
  customer?: { id: string; name: string; company: string | null; phone?: string | null } | null;
};

/** Serializes a follow-up (with optional lead/customer) for client rows. */
export function toFollowUpRow(f: WithContact): FollowUpRowData {
  const contact = f.customer
    ? { name: f.customer.name, href: `/customers/${f.customer.id}`, detail: f.customer.company }
    : f.lead
      ? { name: f.lead.name, href: `/leads/${f.lead.id}`, detail: f.lead.company }
      : null;
  return {
    id: f.id,
    task: f.task,
    dueDate: f.dueDate.toISOString(),
    priority: f.priority,
    status: f.status,
    completedAt: f.completedAt?.toISOString() ?? null,
    contact,
  };
}
