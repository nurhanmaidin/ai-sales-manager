import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validators/auth";
import { followUpInputSchema, leadInputSchema, noteInputSchema } from "@/lib/validators/crm";
import { onboardingSchema } from "@/lib/validators/organization";

describe("validators", () => {
  it("requires a strong enough password on sign-up", () => {
    expect(
      registerSchema.safeParse({ name: "Ali", email: "a@b.co", password: "short" }).success
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Ali", email: "a@b.co", password: "lettersonly" }).success
    ).toBe(false);
    const ok = registerSchema.parse({ name: " Ali ", email: " A@B.CO ", password: "Sales12345" });
    expect(ok.email).toBe("a@b.co");
    expect(ok.name).toBe("Ali");
  });

  it("applies lead defaults and normalises optional fields", () => {
    const lead = leadInputSchema.parse({
      name: "Tan Wei Ming",
      email: "",
      estimatedValue: "25,000",
    });
    expect(lead.status).toBe("NEW");
    expect(lead.priority).toBe("MEDIUM");
    expect(lead.email).toBeNull();
    expect(lead.estimatedValue).toBe(25000);
  });

  it("rejects invalid lead contact details and amounts", () => {
    expect(leadInputSchema.safeParse({ name: "X" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ name: "Tan", email: "not-an-email" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ name: "Tan", phone: "abc" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ name: "Tan", estimatedValue: "-5" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ name: "Tan", status: "HACKED" }).success).toBe(false);
  });

  it("ignores unknown keys such as a client-supplied organizationId", () => {
    const lead = leadInputSchema.parse({ name: "Tan", organizationId: "someone-else" });
    expect("organizationId" in lead).toBe(false);
  });

  it("requires a note to belong to exactly one parent", () => {
    expect(noteInputSchema.safeParse({ content: "hi" }).success).toBe(false);
    expect(noteInputSchema.safeParse({ content: "hi", leadId: "a", customerId: "b" }).success).toBe(
      false
    );
    expect(noteInputSchema.safeParse({ content: "hi", leadId: "a" }).success).toBe(true);
  });

  it("requires a follow-up target and due date", () => {
    expect(
      followUpInputSchema.safeParse({ task: "Call", dueDate: "2026-10-01T10:00:00Z" }).success
    ).toBe(false);
    expect(followUpInputSchema.safeParse({ task: "Call", dueDate: "", leadId: "x" }).success).toBe(
      false
    );
    expect(
      followUpInputSchema.safeParse({ task: "Call", dueDate: "2026-10-01T10:00:00Z", leadId: "x" })
        .success
    ).toBe(true);
  });

  it("validates onboarding phone numbers", () => {
    const base = {
      name: "BrightBuild",
      businessType: "Other",
      ownerName: "Aisyah",
      email: "a@b.co",
      country: "Malaysia",
      currency: "MYR",
    };
    expect(onboardingSchema.safeParse({ ...base, phone: "+60 12-345 6789" }).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...base, phone: "call me" }).success).toBe(false);
  });
});
