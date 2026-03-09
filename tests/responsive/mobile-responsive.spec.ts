// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Mobile Responsive Layout", async ({ page }) => {
    await mockFailedLogin(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:5173/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    const mobileLayout = await page.evaluate(() => {
      const hasHorizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth;

      const signInButton =
        document.querySelector('button[type="submit"]') || document.querySelector("button");
      const emailField = document.querySelector('input[type="email"]');
      const passwordField = document.querySelector('input[type="password"]');

      const getElementSize = (element) => {
        if (!element) return { width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };

      const signInSize = getElementSize(signInButton);
      const emailSize = getElementSize(emailField);
      const passwordSize = getElementSize(passwordField);

      const emailStyles = emailField ? window.getComputedStyle(emailField) : null;
      const passwordStyles = passwordField ? window.getComputedStyle(passwordField) : null;

      const emailFontSize = emailStyles ? parseInt(emailStyles.fontSize) : 0;
      const passwordFontSize = passwordStyles ? parseInt(passwordStyles.fontSize) : 0;

      return {
        hasHorizontalScroll,
        signInButtonSize: signInSize,
        emailFieldSize: emailSize,
        passwordFieldSize: passwordSize,
        emailFontSize,
        passwordFontSize,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(mobileLayout.hasHorizontalScroll).toBe(false);
    expect(mobileLayout.signInButtonSize.height).toBeGreaterThanOrEqual(44);
    expect(mobileLayout.emailFontSize).toBeGreaterThanOrEqual(16);
    expect(mobileLayout.passwordFontSize).toBeGreaterThanOrEqual(16);
    expect(mobileLayout.viewportWidth).toBe(375);
    expect(mobileLayout.viewportHeight).toBe(667);

    await page.getByRole("textbox", { name: "Email *" }).fill("test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("password123");

    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("test@example.com");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("password123");

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    const postInteractionLayout = await page.evaluate(() => ({
      hasHorizontalScroll:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(postInteractionLayout.hasHorizontalScroll).toBe(false);
  });
});
