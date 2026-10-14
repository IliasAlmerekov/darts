// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "../shared/test";
import { mockFailedLogin, mockUnauthenticatedSession } from "../shared/auth-route-mocks";

test.describe("Accessibility and Usability", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedSession(page);
  });

  test("Screen Reader Compatibility", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");

    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveAttribute("required");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveAttribute("required");

    await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();

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

  test("Login error is announced through role=alert", async ({ page }) => {
    await mockFailedLogin(page);
    await page.goto("/");

    await page.getByRole("textbox", { name: "Email *" }).fill("wrong@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText("Incorrect email or password.");
  });

  test("Success message is announced through role=status", async ({ page }) => {
    await page.goto("/?left=1");

    await expect(page.getByRole("status")).toHaveText("You have successfully left the game");
  });
});
