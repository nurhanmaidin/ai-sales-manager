import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test("create a quotation with live totals, send it and accept it", async ({ page }) => {
  await signUpAndOnboard(page, "Quote Builders");

  await page.goto("/leads?new=1");
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill("Lim Mei Ling");
  await sheet.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { name: "Lim Mei Ling", level: 1 })).toBeVisible();

  // Start from the lead so the recipient is preselected.
  await page.getByRole("link", { name: "Create quotation" }).first().click();
  await expect(page).toHaveURL(/\/quotations\/new\?leadId=/);
  await expect(page.getByRole("heading", { name: "New quotation" })).toBeVisible();
  await expect(page.locator("#q-recipient")).toContainText("Lim Mei Ling");

  await page.getByLabel("Title").fill("Kitchen renovation");
  await page.getByRole("textbox", { name: "Item 1 description" }).fill("Kitchen cabinets");
  await page.getByLabel("Qty").first().fill("120");
  await page.getByLabel("Unit price").first().fill("85");

  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("textbox", { name: "Item 2 description" }).fill("Quartz countertop");
  await page.getByLabel("Unit price").nth(1).fill("2600");

  await page.getByLabel("Discount").fill("800");
  await page.getByRole("button", { name: "8%" }).click();

  // 120 × 85 + 2,600 = 12,800 − 800 = 12,000 + 8% SST = 12,960
  await expect(page.getByTestId("quotation-total")).toHaveText("RM 12,960.00");

  await page.getByRole("button", { name: "Save & mark as sent" }).click();
  await expect(page).toHaveURL(/\/quotations\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/QT-\d{4}-0001/);
  await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Mark as accepted" }).click();
  await expect(page.getByText(/marked as accepted/)).toBeVisible();
  await expect(page.getByText("Accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);

  // The lead moved to Won automatically.
  await page.getByRole("link", { name: "Lim Mei Ling" }).click();
  await expect(page.getByText("Deal won — nice work.")).toBeVisible();
});
