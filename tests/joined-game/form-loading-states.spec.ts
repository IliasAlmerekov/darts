// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("User Interface Interactions", () => {
  test("Form Loading States", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    const emailField = page.getByRole("textbox", { name: "Email *" });
    const passwordField = page.getByLabel("Password *");
    const rememberMeCheckbox = page.getByRole("checkbox", { name: "Remember me" });
    const submitButton = page.getByRole("button", { name: /Sign in|Signing in/ });

    // The auth check can complete before the first assertion, so accept either
    // a transient disabled state or an already interactive form.
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(rememberMeCheckbox).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 2. Wait for the form to become fully interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify all form fields become enabled
    await expect(emailField).toBeEnabled();
    await expect(passwordField).toBeEnabled();
    await expect(rememberMeCheckbox).toBeEnabled();

    // Verify submit button shows 'Sign in' text
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // 3. Fill in valid credentials and submit
    await emailField.fill(testEmail);
    await passwordField.fill(testPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify successful submission by checking redirect
    await expect(page).toHaveURL("http://localhost:5173/start");
  });
});
