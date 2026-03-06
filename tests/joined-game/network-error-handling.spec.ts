// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("Error Handling and Edge Cases", () => {
  test("Network Error Handling", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to login page and fill valid credentials
    await page.goto("http://localhost:5173/");

    // Verify form is ready for submission
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Fill valid credentials
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);

    // 2. Block network requests to simulate network error
    await page.route("**/api/login", (route) => route.abort("failed"));

    // Attempt to submit the form
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify network error message is displayed
    await expect(
      page.getByText("Network error. Please check your connection and try again."),
    ).toBeVisible();

    // Verify form remains accessible
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify credentials are preserved
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(testEmail);
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(testPassword);

    // 3. Restore network and retry submission
    await page.unroute("**/api/login");

    // Retry submission
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify login succeeds normally and error message disappears
    await expect(page).toHaveURL("http://localhost:5173/start");
    await expect(
      page.getByText("Network error. Please check your connection and try again."),
    ).not.toBeVisible();
  });
});
