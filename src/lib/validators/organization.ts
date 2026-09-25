import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,18}$/, "Enter a valid phone number, e.g. +60 12-345 6789");

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  businessType: z.string().trim().min(1, "Choose the option closest to your business").max(80),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(80),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid business email").max(160),
  country: z.string().trim().min(2).max(60),
  currency: z.string().trim().length(3),
  description: optionalText(600),
});

export const organizationProfileSchema = onboardingSchema.extend({
  phone: phoneSchema.or(z.literal("")).transform((v) => v || null),
  website: optionalText(200),
  address: optionalText(400),
  registrationNumber: optionalText(60),
  taxInfo: optionalText(120),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OrganizationProfileInput = z.input<typeof organizationProfileSchema>;
