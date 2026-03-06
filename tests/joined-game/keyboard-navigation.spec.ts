// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("Accessibility and Usability", () => {
  test("Keyboard Navigation", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to login page using only keyboard (Tab key)
    await page.goto("http://localhost:5173/");

    // Verify all interactive elements are visible before starting navigation
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();

    // Tab order verification: email → password → show/hide → remember me → submit → sign up link

    // Tab to email field
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeFocused();

    // Tab to password field
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeFocused();

    // Tab to show password button
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();

    // Tab to remember me checkbox
    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeFocused();

    // Tab to submit button
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();

    // Tab to sign up link
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

    // 2. Fill form using only keyboard input

    // Navigate back to email field
    await page.keyboard.press("Shift+Tab"); // Back to submit button
    await page.keyboard.press("Shift+Tab"); // Back to remember me
    await page.keyboard.press("Shift+Tab"); // Back to show password
    await page.keyboard.press("Shift+Tab"); // Back to password field
    await page.keyboard.press("Shift+Tab"); // Back to email field

    // Type in email field
    await page.getByRole("textbox", { name: "Email *" }).pressSequentially(testEmail);

    // Tab to password field and type
    await page.keyboard.press("Tab");
    await page.getByRole("textbox", { name: "Password *" }).pressSequentially(testPassword);

    // Tab to show password button and activate with Enter
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    // Verify password toggle worked
    await expect(page.getByRole("button", { name: "Hide password" })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("type", "text");

    // Tab to remember me checkbox and check with Space
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");

    // Verify checkbox is checked
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeChecked();

    // 3. Submit form using Enter key
    // Navigate back to email field to test Enter key submission
    await page.keyboard.press("Shift+Tab"); // Back to show password
    await page.keyboard.press("Shift+Tab"); // Back to password field
    await page.keyboard.press("Shift+Tab"); // Back to email field

    // Submit form by pressing Enter in email field
    await page.keyboard.press("Enter");

    // Verify form submission behavior (should be identical to mouse click)
    await expect(page).toHaveURL("http://localhost:5173/start");
  });
});
