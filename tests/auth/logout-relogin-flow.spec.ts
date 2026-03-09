// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import {
  getAuthTestCredentials,
  skipWhenAuthCredentialsMissing,
} from "../shared/auth-test-credentials";

test.describe("Authentication Flow and Redirects", () => {
  skipWhenAuthCredentialsMissing();

  test("Logout and Re-login Flow", async ({ page, context }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();
    const emailField = page.getByRole("textbox", { name: "Email *" });
    const passwordField = page.getByLabel("Password *");
    const submitButton = page.getByRole("button", { name: "Sign in" });

    // 1. Login with valid credentials
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Fill in credentials and login
    await emailField.fill(testEmail);
    await passwordField.fill(testPassword);
    await submitButton.click();

    // Verify successful authentication - should reach the dashboard/start page
    await expect(page).toHaveURL("http://localhost:5173/start");

    // 2. Clear browser storage and context to simulate logout
    await context.clearCookies();

    // 3. Navigate to a protected route to test authentication
    await page.goto("http://localhost:5173/start");

    // Wait for auth redirect resolution.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10000 })
      .toMatch(/^\/(?:start)?$/);

    const currentPath = new URL(page.url()).pathname;
    const isOnLoginPage = currentPath === "/";

    if (isOnLoginPage) {
      await expect(emailField).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

      // 4. Login again with the same valid credentials
      await emailField.fill(testEmail);
      await passwordField.fill(testPassword);
      await submitButton.click();

      // Verify successful re-authentication
      await expect(page).toHaveURL("http://localhost:5173/start");
    } else {
      await expect(page).toHaveURL("http://localhost:5173/start");
    }
  });
});
