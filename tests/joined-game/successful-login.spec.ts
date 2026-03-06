// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials, skipWhenAuthCredentialsMissing } from "./auth-test-credentials";

test.describe("Login Form Functionality", () => {
  skipWhenAuthCredentialsMissing();

  test("Successful Login with Valid Credentials", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to the login page at root URL '/'
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify login page loaded with required elements
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // 2. Enter the valid test email from PLAYWRIGHT_TEST_EMAIL in the email field
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);

    // 3. Enter the valid test password from PLAYWRIGHT_TEST_PASSWORD in the password field
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);

    // 4. Click the 'Sign in' button to submit the form
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify successful redirect to start page
    await expect(page).toHaveURL("http://localhost:5173/start");
  });
});
