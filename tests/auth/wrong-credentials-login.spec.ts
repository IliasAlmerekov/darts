// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

test.describe("Login Form Functionality", () => {
  test("Login with Wrong Credentials", async ({ page }) => {
    await mockFailedLogin(page);

    // 1. Navigate to the login page
    await page.goto("http://localhost:5173/");

    // Wait for form to become interactive
    await page.getByText("Sign in").first().waitFor({ state: "visible" });

    // Verify login form is displayed
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 2. Enter valid email format but wrong email 'wrong@example.com'
    await page.getByRole("textbox", { name: "Email *" }).fill("wrong@example.com");

    // 3. Enter incorrect password 'wrongpassword'
    await page.getByRole("textbox", { name: "Password *" }).fill("wrongpassword");

    // 4. Click the 'Sign in' button
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify error message appears indicating invalid credentials
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    // Verify user remains on login page
    await expect(page).toHaveURL("http://localhost:5173/");

    // Verify form fields remain populated
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("wrong@example.com");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("wrongpassword");
  });
});
