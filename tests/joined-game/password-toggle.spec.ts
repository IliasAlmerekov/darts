// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("User Interface Interactions", () => {
  test("Password Visibility Toggle", async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify initial state - password field is masked and button shows 'Show password'
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute(
      "type",
      "password",
    );
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

    // 2. Enter text 'testpassword' in the password field
    await page.getByRole("textbox", { name: "Password *" }).fill("testpassword");

    // Verify password value is set
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("testpassword");

    // 3. Click the 'Show password' toggle button
    await page.getByRole("button", { name: "Show password" }).click();

    // Verify password becomes visible as plain text and button changes to 'Hide password'
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();

    // 4. Click the 'Hide password' toggle button
    await page.getByRole("button", { name: "Hide password" }).click();

    // Verify password becomes masked again and button changes back to 'Show password'
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute(
      "type",
      "password",
    );
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

    // Verify password value is preserved
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("testpassword");
  });
});
