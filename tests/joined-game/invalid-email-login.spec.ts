// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Login Form Functionality", () => {
  test("Login with Invalid Email Format", async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify login form is displayed and interactive
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();

    // 2. Enter invalid email format 'invalid-email' in the email field
    await page.getByRole("textbox", { name: "Email *" }).fill("invalid-email");

    // 3. Enter any password in the password field
    await page.getByRole("textbox", { name: "Password *" }).fill("anypassword");

    // 4. Click the 'Sign in' button
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify form did not submit to the server (still on login page)
    await expect(page).toHaveURL("http://localhost:5173/");

    // Verify email field remains focused (HTML5 validation)
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeFocused();
  });
});
