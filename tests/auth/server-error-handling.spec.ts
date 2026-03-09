// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Error Handling and Edge Cases", () => {
  test("Server Error Response Handling", async ({ page }) => {
    // 1. Navigate to login page
    await page.goto("http://localhost:5173/");

    // Verify login form is displayed
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // Fill credentials for testing
    await page.getByRole("textbox", { name: "Email *" }).fill("test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("testpass");

    // 2. Mock server to return 500 error and attempt login
    await page.route("**/api/login", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify appropriate server error message is displayed
    await expect(page.getByText("Server error. Please try again later.")).toBeVisible();

    // Verify form remains usable
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify form remains populated
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("test@example.com");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("testpass");

    // 3. Mock server to return authentication failure
    await page.route("**/api/login", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Incorrect email or password" }),
      });
    });

    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify 'Incorrect email or password' message is displayed
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    // Verify form remains populated and user can correct credentials
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("test@example.com");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("testpass");
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
  });
});
