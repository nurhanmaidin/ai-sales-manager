import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

const PUBLIC_PAGES = ["/", "/login", "/register"];
const APP_PAGES = [
  "/dashboard",
  "/leads",
  "/customers",
  "/quotations",
  "/quotations/new",
  "/followups",
  "/ai-assistant",
  "/settings",
  "/settings?tab=ai",
];

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${path} :: ${v.id} (${v.impact}) — ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`
  );
  expect(summary, "accessibility violations").toEqual([]);
}

test("public pages have no WCAG A/AA violations", async ({ page }) => {
  for (const path of PUBLIC_PAGES) await audit(page, path);
});

test("app pages have no WCAG A/AA violations", async ({ page }) => {
  await signUpAndOnboard(page, "Accessible Co");
  await page.goto("/leads?new=1");
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill("Audit Lead");
  await sheet.getByLabel("Enquiry").fill("Kitchen renovation, budget RM20k");
  await sheet.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { name: "Audit Lead", level: 1 })).toBeVisible();
  await audit(page, page.url().replace(/^https?:\/\/[^/]+/, ""));
  for (const path of APP_PAGES) await audit(page, path);
});
