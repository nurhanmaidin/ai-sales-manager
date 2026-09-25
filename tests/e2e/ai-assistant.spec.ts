import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test("AI Assistant answers from real data and refuses to invent answers", async ({ page }) => {
  await signUpAndOnboard(page, "Assistant Co");

  await page.goto("/leads?new=1");
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill("Rajesh Kumar");
  await sheet.getByLabel("Estimated value").fill("85000");
  await sheet.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { name: "Rajesh Kumar", level: 1 })).toBeVisible();

  await page.goto("/ai-assistant");
  await page.getByRole("button", { name: "What's my current pipeline value?" }).click();
  await expect(
    page.getByText("Your current pipeline value is RM 85,000.00 across 1 open lead.")
  ).toBeVisible();
  await expect(page.getByText("Based on your 1 open lead")).toBeVisible();

  await page.getByLabel("Ask the AI Assistant").fill("What will the weather be tomorrow?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/I don't have enough information to answer that/)).toBeVisible();
});
