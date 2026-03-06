// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("User Interface Interactions", () => {
  test("Remember Me Checkbox Functionality", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify remember me checkbox is unchecked by default and labeled correctly
    await expect(page.getByRole("checkbox", { name: "Remember me" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeVisible();

    // 2. Click the 'Remember me' checkbox
    await page.getByRole("checkbox", { name: "Remember me" }).click();

    // Verify checkbox becomes checked and state is visibly indicated
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeChecked();

    // 3. Click the 'Remember me' checkbox again
    await page.getByRole("checkbox", { name: "Remember me" }).click();

    // Verify checkbox becomes unchecked and returns to default state
    await expect(page.getByRole("checkbox", { name: "Remember me" })).not.toBeChecked();

    // 4. Check the remember me option and then login with valid credentials
    await page.getByRole("checkbox", { name: "Remember me" }).click();
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify login succeeds normally with remember me preference
    await expect(page).toHaveURL("http://localhost:5173/start");
  });
});
