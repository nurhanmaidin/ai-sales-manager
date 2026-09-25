import { test, expect } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test.describe("Core CRM workflow", () => {
  test("create a lead, generate an AI response, schedule a follow-up, win and convert", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "Workflow Renovation");

    // Empty state guides the first action.
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: "Your pipeline starts here" })).toBeVisible();
    await page.getByRole("button", { name: "Add your first lead" }).click();

    // Create lead
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name").fill("Tan Wei Ming");
    await sheet.getByLabel("Phone").fill("012-338 4721");
    await sheet
      .getByLabel("Enquiry")
      .fill(
        "Hi, I'd like to renovate my kitchen in my PJ condo, around 120 sqft. Budget about RM25k."
      );
    await sheet.getByLabel("Estimated value").fill("28000");
    await sheet.getByRole("radio", { name: "High" }).click();
    await sheet.getByRole("button", { name: "Add lead" }).click();

    await expect(page).toHaveURL(/\/leads\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Tan Wei Ming", level: 1 })).toBeVisible();
    await expect(page.getByText("RM 28,000.00")).toBeVisible();

    // Generate AI response
    await page.getByRole("button", { name: "Generate AI response" }).click();
    await expect(page.getByText("AI Summary")).toBeVisible();
    await expect(page.getByText("Project type: Kitchen renovation")).toBeVisible();
    await expect(page.getByText("Budget: around RM25,000")).toBeVisible();
    const reply = page.getByLabel("Suggested response");
    await expect(reply).toHaveValue(/Hi Tan/);

    await page.getByRole("button", { name: "Make formal" }).click();
    await expect(reply).toHaveValue(/^Dear Tan Wei Ming,/);

    // Schedule follow-up from the lead page
    await page.getByRole("button", { name: "Add follow-up" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Task").fill("Call to arrange site visit");
    await dialog.getByRole("button", { name: "Tomorrow" }).click();
    await dialog.getByRole("button", { name: "Schedule" }).click();
    await expect(page.getByText("Follow-up scheduled").first()).toBeVisible();
    await expect(page.getByText("Call to arrange site visit", { exact: true })).toBeVisible();

    // Add a note
    await page.getByRole("tab", { name: /Notes/ }).click();
    await page.getByLabel("Add a note").fill("Prefers weekend site visits");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("Prefers weekend site visits", { exact: true })).toBeVisible();

    // Move to Won via the pipeline stepper, then convert
    await page
      .getByRole("navigation", { name: "Pipeline stage" })
      .getByRole("button", { name: "Won" })
      .click();
    await expect(page.getByText("Deal won — nice work.")).toBeVisible();
    await page.getByRole("button", { name: "Convert to customer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Convert to customer" }).click();

    await expect(page).toHaveURL(/\/customers\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Tan Wei Ming", level: 1 })).toBeVisible();
    // History carried over
    await expect(page.getByText("Converted to customer from won lead")).toBeVisible();
    await expect(page.getByText("Lead created from WhatsApp")).toBeVisible();
    await page.getByRole("tab", { name: /Notes/ }).click();
    await expect(page.getByText("Prefers weekend site visits", { exact: true })).toBeVisible();

    await page.goto("/customers");
    await expect(page.getByRole("link", { name: "Tan Wei Ming" })).toBeVisible();
  });

  test("filters and searches leads", async ({ page }) => {
    await signUpAndOnboard(page, "Filter Co");
    for (const [name, priority] of [
      ["Alpha Lead", "High"],
      ["Beta Lead", "Low"],
    ] as const) {
      await page.goto("/leads?new=1");
      const sheet = page.getByRole("dialog");
      await sheet.getByLabel("Name").fill(name);
      await sheet.getByRole("radio", { name: priority }).click();
      await sheet.getByRole("button", { name: "Add lead" }).click();
      await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    }
    await page.goto("/leads");
    await page.getByLabel("Search leads").fill("alpha");
    await expect(page).toHaveURL(/q=alpha/);
    await expect(page.getByRole("link", { name: "Alpha Lead" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Beta Lead" })).toHaveCount(0);
  });
});
