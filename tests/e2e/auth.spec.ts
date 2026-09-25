import { expect, test } from "./fixtures";
import { signUpAndOnboard, TEST_PASSWORD } from "./helpers";

test.describe("Authentication", () => {
  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/login/);
  });

  test("sign up, onboard, log out, and log back in", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);

    // Log out through the user menu.
    await page.getByRole("button", { name: /Aisyah Rahman/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Wrong password shows a friendly error.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-1");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/doesn.t match our records/)).toBeVisible();

    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("rejects duplicate sign-up", async ({ page, browser }) => {
    const { email } = await signUpAndOnboard(page);
    // A fresh, signed-out browser context tries to reuse the same email.
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Someone Else");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
    await context.close();
  });
});
