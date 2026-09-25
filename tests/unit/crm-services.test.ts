import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { leadService } from "@/lib/leads/service";
import { customerService } from "@/lib/customers/service";
import { followUpService, snoozeUntil } from "@/lib/followups/service";
import { noteService } from "@/lib/notes/service";
import { organizationService } from "@/lib/organizations/service";
import { AppError, ForbiddenError } from "@/lib/errors";
import { createTenant } from "./helpers";

let ctx: TenantContext;

beforeAll(async () => {
  ctx = await createTenant("CRM Services Co");
});

describe("leadService", () => {
  it("creates a lead with an activity and an optional follow-up", async () => {
    const due = new Date(Date.now() + 86_400_000);
    const lead = await leadService.create(ctx, {
      name: "Tan Wei Ming",
      source: "WHATSAPP",
      estimatedValue: "28,000",
      description: "Kitchen renovation",
      nextFollowUpAt: due.toISOString(),
    });
    expect(lead.organizationId).toBe(ctx.organizationId);
    expect(Number(lead.estimatedValue)).toBe(28000);
    expect(lead.status).toBe("NEW");

    const activities = await prisma.activity.findMany({ where: { leadId: lead.id } });
    expect(activities.map((a) => a.type).sort()).toEqual(["FOLLOW_UP_SCHEDULED", "LEAD_CREATED"]);

    const followUps = await prisma.followUp.findMany({ where: { leadId: lead.id } });
    expect(followUps).toHaveLength(1);
    expect(followUps[0]!.task).toBe("Follow up with Tan Wei Ming");
    expect(followUps[0]!.priority).toBe(lead.priority);
  });

  it("records status changes and first contact", async () => {
    const lead = await leadService.create(ctx, { name: "Nurul Aisyah" });
    const updated = await leadService.changeStatus(ctx, lead.id, "CONTACTED");
    expect(updated.status).toBe("CONTACTED");
    expect(updated.lastContactAt).not.toBeNull();

    const change = await prisma.activity.findFirst({
      where: { leadId: lead.id, type: "STATUS_CHANGED" },
    });
    expect(change?.description).toBe("Status changed from New to Contacted");
    expect(change?.metadata).toEqual({ from: "NEW", to: "CONTACTED" });

    await expect(leadService.changeStatus(ctx, lead.id, "BOGUS")).rejects.toThrow();
  });

  it("filters by status, priority and search text", async () => {
    await leadService.create(ctx, {
      name: "Filter Alpha",
      priority: "HIGH",
      company: "Zebra Sdn Bhd",
    });
    await leadService.create(ctx, { name: "Filter Beta", priority: "LOW" });
    const high = await leadService.list(ctx, { priority: "HIGH", q: "filter" });
    expect(high.map((l) => l.name)).toEqual(["Filter Alpha"]);
    const byCompany = await leadService.list(ctx, { q: "zebra" });
    expect(byCompany).toHaveLength(1);
    expect(leadService.parseFilters({ status: "NOPE", priority: "HIGH" })).toEqual({
      priority: "HIGH",
    });
  });

  it("keeps quotations when a lead is deleted", async () => {
    const lead = await leadService.create(ctx, { name: "To Delete" });
    const quotation = await prisma.quotation.create({
      data: {
        organizationId: ctx.organizationId,
        quotationNumber: `QT-DEL-${Date.now()}`,
        leadId: lead.id,
      },
    });
    await leadService.remove(ctx, lead.id);
    expect(await prisma.lead.findUnique({ where: { id: lead.id } })).toBeNull();
    const kept = await prisma.quotation.findUnique({ where: { id: quotation.id } });
    expect(kept?.leadId).toBeNull();
  });
});

describe("convert to customer", () => {
  it("only converts won leads", async () => {
    const lead = await leadService.create(ctx, { name: "Not Yet Won" });
    await expect(leadService.convertToCustomer(ctx, lead.id)).rejects.toBeInstanceOf(AppError);
  });

  it("creates a customer and carries over the relationship history", async () => {
    const lead = await leadService.create(ctx, {
      name: "Daniel Wong",
      email: "daniel@example.com",
      phone: "012-908 1156",
      nextFollowUpAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await noteService.create(ctx, { leadId: lead.id, content: "Prefers WhatsApp" });
    const quotation = await prisma.quotation.create({
      data: {
        organizationId: ctx.organizationId,
        quotationNumber: `QT-CONV-${Date.now()}`,
        leadId: lead.id,
      },
    });
    await leadService.changeStatus(ctx, lead.id, "WON");

    const customer = await leadService.convertToCustomer(ctx, lead.id);
    expect(customer).toMatchObject({
      name: "Daniel Wong",
      email: "daniel@example.com",
      phone: "012-908 1156",
    });

    const refreshed = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(refreshed.convertedCustomerId).toBe(customer.id);
    expect(
      (await prisma.quotation.findUniqueOrThrow({ where: { id: quotation.id } })).customerId
    ).toBe(customer.id);
    expect(await prisma.note.count({ where: { customerId: customer.id } })).toBe(1);
    expect(await prisma.followUp.count({ where: { customerId: customer.id } })).toBe(1);
    const activityTypes = (
      await prisma.activity.findMany({ where: { customerId: customer.id } })
    ).map((a) => a.type);
    expect(activityTypes).toEqual(
      expect.arrayContaining(["LEAD_CREATED", "NOTE_ADDED", "STATUS_CHANGED", "CUSTOMER_CREATED"])
    );

    // Idempotent: converting again returns the same customer.
    const again = await leadService.convertToCustomer(ctx, lead.id);
    expect(again.id).toBe(customer.id);
    expect(
      await prisma.customer.count({
        where: { organizationId: ctx.organizationId, name: "Daniel Wong" },
      })
    ).toBe(1);

    const detail = await customerService.get(ctx, customer.id);
    expect(detail.leadsWon.map((l) => l.id)).toEqual([lead.id]);
  });
});

describe("followUpService", () => {
  it("creates follow-ups and keeps the lead's next follow-up in sync", async () => {
    const lead = await leadService.create(ctx, { name: "Follow Me" });
    const later = new Date(Date.now() + 3 * 86_400_000);
    const sooner = new Date(Date.now() + 86_400_000);
    await followUpService.create(ctx, {
      leadId: lead.id,
      task: "Later",
      dueDate: later.toISOString(),
    });
    const soon = await followUpService.create(ctx, {
      leadId: lead.id,
      task: "Sooner",
      dueDate: sooner.toISOString(),
      priority: "HIGH",
    });

    let refreshed = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(refreshed.nextFollowUpAt?.getTime()).toBe(sooner.getTime());

    await followUpService.complete(ctx, soon.id);
    refreshed = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(refreshed.nextFollowUpAt?.getTime()).toBe(later.getTime());
    expect(refreshed.lastContactAt).not.toBeNull();
    const completed = await prisma.followUp.findUniqueOrThrow({ where: { id: soon.id } });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("buckets follow-ups into overdue, today, upcoming and completed views", async () => {
    const tenant = await createTenant("Views Co");
    const lead = await leadService.create(tenant, { name: "Viewer" });
    const now = Date.now();
    const overdue = await followUpService.create(tenant, {
      leadId: lead.id,
      task: "Overdue",
      dueDate: new Date(now - 3 * 86_400_000).toISOString(),
    });
    await followUpService.create(tenant, {
      leadId: lead.id,
      task: "Upcoming",
      dueDate: new Date(now + 5 * 86_400_000).toISOString(),
    });
    await followUpService.complete(
      tenant,
      (
        await followUpService.create(tenant, {
          leadId: lead.id,
          task: "Done",
          dueDate: new Date(now).toISOString(),
        })
      ).id
    );

    const counts = await followUpService.counts(tenant);
    expect(counts).toMatchObject({ overdue: 1, upcoming: 1, completed: 1 });
    expect((await followUpService.list(tenant, "overdue")).map((f) => f.id)).toEqual([overdue.id]);

    await followUpService.snooze(tenant, overdue.id, { preset: "3d" });
    const snoozed = await prisma.followUp.findUniqueOrThrow({ where: { id: overdue.id } });
    expect(snoozed.status).toBe("SNOOZED");
    expect(snoozed.dueDate.getTime()).toBeGreaterThan(now);
    expect((await followUpService.counts(tenant)).overdue).toBe(0);
  });

  it("computes snooze presets", () => {
    const base = new Date("2026-09-24T15:30:00+08:00");
    expect(snoozeUntil("1h", base).getTime()).toBe(base.getTime() + 3_600_000);
    const tomorrow = snoozeUntil("tomorrow", base);
    expect(tomorrow.getDate()).toBe(25);
    expect(tomorrow.getHours()).toBe(9);
  });
});

describe("authorization", () => {
  it("only lets owners and admins change business settings", async () => {
    const member = await createTenant("Member Co", "MEMBER");
    await expect(
      organizationService.updateProfile(member, { name: "Hijacked" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: member.organizationId },
    });
    expect(org.name).toBe("Member Co");
  });

  it("completes onboarding for the owner", async () => {
    const owner = await createTenant("Onboard Co");
    const org = await organizationService.completeOnboarding(owner, {
      name: "BrightBuild Renovation",
      businessType: "Renovation & Construction",
      ownerName: "Aisyah Rahman",
      phone: "+60 12-345 6789",
      email: "hello@brightbuild.my",
      country: "Malaysia",
      currency: "MYR",
      description: "",
    });
    expect(org.name).toBe("BrightBuild Renovation");
    expect(org.description).toBeNull();
    expect(org.onboardingCompletedAt).not.toBeNull();
  });
});
