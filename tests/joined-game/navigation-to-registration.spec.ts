// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("User Interface Interactions", () => {
  test("Navigation to Registration", async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Verify login page displays with 'Don't have an account? Sign up' text and link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();

    // 2. Click the 'Sign up' link
    await page.getByRole("link", { name: "Sign up" }).click();

    // Verify navigation to '/register' page
    await expect(page).toHaveURL("http://localhost:5173/register");

    // Verify registration form is displayed with 'Create an account' heading
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Username *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // 3. On registration page, click the 'Sign in' link
    await page.getByRole("link", { name: "Sign in" }).click();

    // Verify navigation back to '/' login page
    await expect(page).toHaveURL("http://localhost:5173/");

    // Verify login form is displayed
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
  });
});
