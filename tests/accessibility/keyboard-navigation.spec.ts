// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "../shared/test";
import { MOCK_LOGIN_CREDENTIALS, mockAdminLoginFlow } from "../shared/auth-route-mocks";

test.describe("Accessibility and Usability", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminLoginFlow(page);
  });

  test("Keyboard Navigation", async ({ page }) => {
    const { email: testEmail, password: testPassword } = MOCK_LOGIN_CREDENTIALS;

    // 1. Navigate to login page using only keyboard (Tab key)
    await page.goto("/");

    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

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

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/start");
  });
});
