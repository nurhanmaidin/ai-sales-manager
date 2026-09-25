import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

const PAGES = [
  "/dashboard",
  "/leads",
  "/customers",
  "/quotations",
  "/quotations/new",
  "/followups",
  "/ai-assistant",
  "/settings",
];

test("mobile: no horizontal page scroll and the navigation drawer works", async ({ page }) => {
  await signUpAndOnboard(page, "Mobile Co");
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Quotations" }).click();
  await expect(page).toHaveURL(/\/quotations$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
