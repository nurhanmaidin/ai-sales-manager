import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test("follow-ups can be completed, found under Completed, and reopened", async ({ page }) => {
  await signUpAndOnboard(page, "Follow Up Co");

  // New leads schedule a follow-up for tomorrow by default.
  await page.goto("/leads?new=1");
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill("Siti Hajar");
  await sheet.getByLabel("Task").fill("Send repainting estimate");
  await sheet.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { name: "Siti Hajar", level: 1 })).toBeVisible();

  await page.goto("/followups");
  await expect(page.getByText("You're all caught up for today")).toBeVisible();

  await page.getByRole("link", { name: /Upcoming/ }).click();
  await expect(page.getByRole("heading", { name: "Tomorrow" })).toBeVisible();
  await page.getByRole("button", { name: "Mark complete: Send repainting estimate" }).click();
  await expect(page.getByText("Follow-up completed")).toBeVisible();

  await page.getByRole("link", { name: /Completed/ }).click();
  await expect(page.getByText("Send repainting estimate")).toBeVisible();
  await page.getByRole("button", { name: "Reopen: Send repainting estimate" }).click();
  await expect(page.getByText("Follow-up reopened")).toBeVisible();

  await page.getByRole("link", { name: /Upcoming/ }).click();
  await expect(page.getByText("Send repainting estimate")).toBeVisible();
});
