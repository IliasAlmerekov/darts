// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Error Handling and Edge Cases", () => {
  test("Long Input Values", async ({ page }) => {
    // 1. Navigate to login page
    await page.goto("http://localhost:5173/");

    // Verify login form is displayed
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // 2. Enter extremely long email (>255 characters) in email field
    const longEmail = "a".repeat(200) + "longemailaddress@" + "b".repeat(100) + ".com";
    await page.getByRole("textbox", { name: "Email *" }).fill(longEmail);

    // Verify field handles long input gracefully and no visual layout breaking occurs
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(longEmail);
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();

    // 3. Enter extremely long password (>1000 characters) in password field
    const longPassword = "c".repeat(1200) + "verylongpassword";
    await page.getByRole("textbox", { name: "Password *" }).fill(longPassword);

    // Verify field handles long input gracefully and no visual layout breaking occurs
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(longPassword);
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    // Verify form layout remains intact
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 4. Attempt to submit with very long values
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify application doesn't crash and provides appropriate validation
    await expect(page).toHaveURL("http://localhost:5173/");

    // Verify form remains accessible and functional
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
