// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { getAuthTestCredentials } from "./auth-test-credentials";

test.describe("Authentication Flow and Redirects", () => {
  test("Success Message Display After Game Exit", async ({ page }) => {
    const { email: testEmail, password: testPassword } = getAuthTestCredentials();

    // 1. Navigate to login page with URL parameter '/?left=1'
    await page.goto("http://localhost:5173/?left=1");

    // Verify success message is displayed above the login form
    await expect(page.getByText("You have successfully left the game")).toBeVisible();

    // Verify login form is still accessible
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // 2. Login with valid credentials from this state
    await page.getByRole("textbox", { name: "Email *" }).fill(testEmail);
    await page.getByRole("textbox", { name: "Password *" }).fill(testPassword);

    // Verify success message remains visible during login process
    await expect(page.getByText("You have successfully left the game")).toBeVisible();

    // Submit login form
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify login proceeds normally - should redirect to start page
    await expect(page).toHaveURL("http://localhost:5173/start");
    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
  });
});
