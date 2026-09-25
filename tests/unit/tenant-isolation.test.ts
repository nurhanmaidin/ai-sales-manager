import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { leadService } from "@/lib/leads/service";
import { customerService } from "@/lib/customers/service";
import { followUpService } from "@/lib/followups/service";
import { noteService } from "@/lib/notes/service";
import { searchService } from "@/lib/search/service";
import { buildAssistantSnapshot } from "@/lib/ai/snapshot";
import { getPipelineMetrics } from "@/lib/dashboard/metrics";
import { NotFoundError } from "@/lib/errors";
import { createTenant } from "./helpers";

// Organization A owns data; organization B must never see or touch it.
let a: TenantContext;
let b: TenantContext;
let leadA: { id: string };
let customerA: { id: string };
let followUpA: { id: string };
let noteA: { id: string };

beforeAll(async () => {
  a = await createTenant("Tenant A");
  b = await createTenant("Tenant B");
  leadA = await leadService.create(a, {
    name: "Secret Lead Alpha",
    estimatedValue: 50000,
    status: "QUALIFIED",
  });
  customerA = await customerService.create(a, { name: "Secret Customer Alpha" });
  followUpA = await followUpService.create(a, {
    leadId: leadA.id,
    task: "Private task",
    dueDate: new Date().toISOString(),
  });
  noteA = await noteService.create(a, { leadId: leadA.id, content: "Confidential" });
});

describe("tenant isolation", () => {
  it("hides other organizations' records from lists", async () => {
    expect(await leadService.list(b)).toHaveLength(0);
    expect(await customerService.list(b)).toHaveLength(0);
    expect(await followUpService.list(b, "today")).toHaveLength(0);
    expect(await leadService.count(b)).toBe(0);
  });

  it("returns not-found when reading another organization's record by id", async () => {
    await expect(leadService.get(b, leadA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(customerService.get(b, customerA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks updates and deletes across organizations", async () => {
    await expect(leadService.update(b, leadA.id, { name: "Hacked" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(leadService.changeStatus(b, leadA.id, "LOST")).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(leadService.remove(b, leadA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      customerService.update(b, customerA.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(followUpService.complete(b, followUpA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(followUpService.remove(b, followUpA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(noteService.remove(b, noteA.id)).rejects.toBeInstanceOf(NotFoundError);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadA.id } });
    expect(lead.name).toBe("Secret Lead Alpha");
    expect(lead.status).toBe("QUALIFIED");
  });

  it("rejects references to another organization's records", async () => {
    await expect(
      followUpService.create(b, {
        leadId: leadA.id,
        task: "Sneaky",
        dueDate: new Date().toISOString(),
      })
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      noteService.create(b, { customerId: customerA.id, content: "Sneaky" })
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(leadService.convertToCustomer(b, leadA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("ignores a client-supplied organizationId", async () => {
    const lead = await leadService.create(b, {
      name: "Mine",
      organizationId: a.organizationId,
    } as never);
    expect(lead.organizationId).toBe(b.organizationId);
  });

  it("scopes search, AI context and metrics to the organization", async () => {
    expect(await searchService.search(b, "Secret")).toHaveLength(0);
    expect((await searchService.search(a, "Secret")).length).toBeGreaterThan(0);

    const snapshot = await buildAssistantSnapshot(b);
    expect(snapshot.leads.some((l) => l.name.includes("Secret"))).toBe(false);
    expect(snapshot.customers).toHaveLength(0);

    const metrics = await getPipelineMetrics(b);
    expect(metrics.pipelineValue).toBe(0);
    expect((await getPipelineMetrics(a)).pipelineValue).toBe(50000);
  });
});
