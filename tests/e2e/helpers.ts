import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const TEST_PASSWORD = "Sales12345";

/** Registers a fresh account and completes the 8-step onboarding. */
export async function signUpAndOnboard(page: Page, businessName = "Playwright Renovation") {
  const email = uniqueEmail();
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Aisyah Rahman");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("What's your business called?").fill(businessName);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: "Renovation & Construction" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Owner name and email are prefilled from the account.
  await expect(page.getByLabel("Who owns the business?")).toHaveValue("Aisyah Rahman");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("What's your business phone number?").fill("+60 12-345 6789");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByLabel("Which email should customers reach you at?")).toHaveValue(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // country (Malaysia)
  await page.getByRole("button", { name: "Continue" }).click(); // currency (MYR)

  await page
    .getByLabel("Describe what you do in a sentence or two.")
    .fill("Kitchen and bathroom renovations in the Klang Valley.");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  return { email };
}
