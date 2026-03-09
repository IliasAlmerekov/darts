// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import {
  getAuthTestCredentials,
  skipWhenAuthCredentialsMissing,
} from "../shared/auth-test-credentials";

test.describe("Accessibility and Usability", () => {
  skipWhenAuthCredentialsMissing();

  test("Keyboard Navigation", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to login page using only keyboard (Tab key)
    await page.goto("http://localhost:5173/");

    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");

    await page.getByRole("textbox", { name: "Email *" }).pressSequentially(testEmail);

    await page.keyboard.press("Tab");
    await page.getByRole("textbox", { name: "Password *" }).pressSequentially(testPassword);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(page.getByRole("button", { name: "Hide password" })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("type", "text");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");

    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeChecked();

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("http://localhost:5173/start");
  });
});
