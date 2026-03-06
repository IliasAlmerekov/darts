// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("Error Handling and Edge Cases", () => {
  test("CSRF Token Handling", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to login page
    await page.goto("http://localhost:5173/");

    // Verify login form is displayed (CSRF token should be properly loaded)
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // Fill valid credentials
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);

    // 2. Mock expired or invalid CSRF token and attempt login
    await page.route("**/api/login", (route) => {
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Security token is invalid or expired. Please try again.",
        }),
      });
    });

    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify CSRF error message is displayed
    await expect(
      page.getByText("Security token is invalid or expired. Please try again."),
    ).toBeVisible();

    // Verify form remains accessible for retry
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify form fields remain populated so user can retry
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(testEmail);
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(testPassword);
  });
});
