// spec: docs/test-plans/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "../shared/test";
import { MOCK_LOGIN_CREDENTIALS, mockAdminLoginFlow } from "../shared/auth-route-mocks";

test.describe("User Interface Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminLoginFlow(page);
  });

  test("Form Loading States", async ({ page }) => {
    const { email: testEmail, password: testPassword } = MOCK_LOGIN_CREDENTIALS;

    // 1. Navigate to the login page
    await page.goto("/");

    const emailField = page.getByRole("textbox", { name: "Email *" });
    const passwordField = page.getByLabel("Password *");
    const submitButton = page.getByRole("button", { name: "Sign in" });

    // Button must be immediately enabled — session check must not block form interaction
    await expect(page.getByRole("button", { name: "Sign in" })).not.toBeDisabled();

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 2. Wait for the form to become fully interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify all form fields become enabled
    await expect(emailField).toBeEnabled();
    await expect(passwordField).toBeEnabled();

    // Verify submit button shows 'Sign in' text
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // 3. Fill in valid credentials and submit
    await emailField.fill(testEmail);
    await passwordField.fill(testPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify successful submission by checking redirect
    await expect(page).toHaveURL("/start");
  });
});
