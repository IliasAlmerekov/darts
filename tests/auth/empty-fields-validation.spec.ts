// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Login Form Functionality", () => {
  test("Empty Field Validation", async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify login form is displayed
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 2. Verify both email and password fields are empty and show placeholder text
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute(
      "placeholder",
      "name@example.com...",
    );
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute(
      "placeholder",
      "Enter your password...",
    );

    // 3. Click the 'Sign in' button with empty fields
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify HTML5 validation prevents submission and focuses on email field
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeFocused();
    await expect(page).toHaveURL("http://localhost:5173/");

    // 4. Fill email field only and leave password empty
    await page.getByRole("textbox", { name: "Email *" }).fill("test@example.com");

    // Verify email field contains the entered value
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("test@example.com");

    // 5. Click the 'Sign in' button with only email filled
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify HTML5 validation focuses on password field
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeFocused();
    await expect(page).toHaveURL("http://localhost:5173/");
  });
});
