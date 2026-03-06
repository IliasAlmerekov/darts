// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Accessibility and Usability", () => {
  test("Screen Reader Compatibility", async ({ page }) => {
    // 1. Navigate to login page with screen reader simulation
    await page.goto("http://localhost:5173/");

    // Verify form has proper heading structure
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");

    // Verify all form fields have associated labels with required indication
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // Verify required fields are properly marked
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute("required");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("required");

    // Verify password toggle button has descriptive accessible name
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

    // Verify checkbox has proper accessible name
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeVisible();

    // 2. Navigate through form to test screen reader announcements

    // Test field purposes are clearly announced through proper input types
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute("type", "email");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute(
      "type",
      "password",
    );

    // Test form structure for screen reader navigation
    await expect(page.locator("form")).toBeVisible();

    // Enter invalid email to test validation message announcement
    await page.getByRole("textbox", { name: "Email *" }).fill("invalid-email");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify HTML5 validation provides accessible error messages
    const emailField = page.getByRole("textbox", { name: "Email *" });
    await expect(emailField).toBeFocused(); // Should focus on invalid field

    // Test that form remains navigable and error states are accessible
    await expect(emailField).toBeVisible();
    await expect(emailField).toBeEnabled();

    // Verify error handling doesn't break form accessibility
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
  });
});
