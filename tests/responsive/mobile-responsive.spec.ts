// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Mobile Responsive Layout", async ({ page }) => {
    await mockFailedLogin(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:5173/");

    const signInButton = page.getByRole("button", { name: "Sign in" });
    const emailField = page.getByRole("textbox", { name: "Email *" });
    const passwordField = page.getByRole("textbox", { name: "Password *" });

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(signInButton).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    const signInBox = await signInButton.boundingBox();
    expect(signInBox?.height).toBeGreaterThanOrEqual(44);

    const emailFontSize = await emailField.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    const passwordFontSize = await passwordField.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(emailFontSize).toBeGreaterThanOrEqual(16);
    expect(passwordFontSize).toBeGreaterThanOrEqual(16);

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(375);
    expect(viewport?.height).toBe(667);

    await emailField.fill("test@example.com");
    await passwordField.fill("password123");

    await expect(emailField).toHaveValue("test@example.com");
    await expect(passwordField).toHaveValue("password123");

    await signInButton.click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(emailField).toBeEnabled();
    await expect(passwordField).toBeEnabled();
    await expect(signInButton).toBeEnabled();

    const hasHorizontalScrollAfter = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScrollAfter).toBe(false);
  });
});
