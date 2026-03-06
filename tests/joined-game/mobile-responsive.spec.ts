// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "./auth-route-mocks";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Mobile Responsive Layout", async ({ page }) => {
    await mockFailedLogin(page);

    // 1. Navigate to login page on mobile viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:5173/");

    // Verify login form is properly sized and layout
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Check mobile layout properties
    const mobileLayout = await page.evaluate(() => {
      const hasHorizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth;

      // Check touch target sizes for main interactive elements
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

      // Check text readability (minimum 16px to prevent iOS zoom)
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

    // Verify no horizontal scrolling required
    expect(mobileLayout.hasHorizontalScroll).toBe(false);

    // Verify main button meets minimum touch target size (44px minimum)
    expect(mobileLayout.signInButtonSize.height).toBeGreaterThanOrEqual(44);

    // Verify text is readable without zooming (16px minimum)
    expect(mobileLayout.emailFontSize).toBeGreaterThanOrEqual(16);
    expect(mobileLayout.passwordFontSize).toBeGreaterThanOrEqual(16);

    // Verify viewport is correctly set to mobile size
    expect(mobileLayout.viewportWidth).toBe(375);
    expect(mobileLayout.viewportHeight).toBe(667);

    // 2. Test form interactions on mobile

    // Test form field interactions
    await page.getByRole("textbox", { name: "Email *" }).fill("test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("password123");

    // Verify form content is entered correctly
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue("test@example.com");
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue("password123");

    // Test button tap interaction
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify form submission works (error message appears for test credentials)
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    // Verify form remains usable after interaction
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify layout remains responsive after interactions
    const postInteractionLayout = await page.evaluate(() => ({
      hasHorizontalScroll:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(postInteractionLayout.hasHorizontalScroll).toBe(false);
  });
});
