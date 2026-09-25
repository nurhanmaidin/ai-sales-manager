import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/auth/context";
import { activityService } from "@/lib/activities/service";
import { NotFoundError } from "@/lib/errors";
import { idSchema, noteInputSchema } from "@/lib/validators/crm";

export const noteService = {
  async create(ctx: TenantContext, input: unknown) {
    const data = noteInputSchema.parse(input);

    // Resolve the parent inside the tenant; a note on a converted lead is
    // also attached to its customer so both histories stay complete.
    let leadId: string | null = null;
    let customerId: string | null = null;
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, organizationId: ctx.organizationId },
        select: { id: true, convertedCustomerId: true },
      });
      if (!lead) throw new NotFoundError("Lead");
      leadId = lead.id;
      customerId = lead.convertedCustomerId;
    } else if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundError("Customer");
      customerId = customer.id;
    }

    return prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          content: data.content,
          leadId,
          customerId,
        },
      });
      await activityService.log(tx, ctx, {
        type: "NOTE_ADDED",
        description: data.content.length > 90 ? `${data.content.slice(0, 90)}…` : data.content,
        leadId,
        customerId,
      });
      return note;
    });
  },

  async remove(ctx: TenantContext, id: string) {
    const note = await prisma.note.findFirst({
      where: { id: idSchema.parse(id), organizationId: ctx.organizationId },
    });
    if (!note) throw new NotFoundError("Note");
    await prisma.note.delete({ where: { id: note.id } });
    return note;
  },

  listForCustomer(ctx: TenantContext, customerId: string) {
    return prisma.note.findMany({
      where: { organizationId: ctx.organizationId, customerId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
