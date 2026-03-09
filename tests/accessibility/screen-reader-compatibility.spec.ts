// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Accessibility and Usability", () => {
  test("Screen Reader Compatibility", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");

    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute("required");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("required");

    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute("type", "email");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute(
      "type",
      "password",
    );

    await expect(page.locator("form")).toBeVisible();

    await page.getByRole("textbox", { name: "Email *" }).fill("invalid-email");
    await page.getByRole("button", { name: "Sign in" }).click();

    const emailField = page.getByRole("textbox", { name: "Email *" });
    await expect(emailField).toBeFocused();
    await expect(emailField).toBeVisible();
    await expect(emailField).toBeEnabled();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
  });
});
