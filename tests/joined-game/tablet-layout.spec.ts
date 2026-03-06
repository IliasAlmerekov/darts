// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Tablet Layout", async ({ page }) => {
    // 1. Navigate to login page on tablet viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("http://localhost:5173/");

    // Verify login form is visible and properly laid out
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Check tablet layout properties and touch target sizes
    const tabletLayout = await page.evaluate(() => {
      const hasHorizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth;

      // Check touch target sizes for main interactive elements
      const signInButton =
        document.querySelector('button[type="submit"]') || document.querySelector("button");
      const emailField = document.querySelector('input[type="email"]');
      const passwordField = document.querySelector('input[type="password"]');
      const showPasswordBtn =
        document.querySelector('button[aria-label*="password"], button[title*="password"]') ||
        document.querySelectorAll("button")[1]; // fallback to second button
      const rememberCheckbox = document.querySelector('input[type="checkbox"]');
      const signUpLink = document.querySelector('a[href="/register"]');

      const getElementSize = (element) => {
        if (!element) return { width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };

      // Get sizes for all interactive elements
      const signInSize = getElementSize(signInButton);
      const emailSize = getElementSize(emailField);
      const passwordSize = getElementSize(passwordField);
      const showPasswordSize = getElementSize(showPasswordBtn);
      const checkboxSize = getElementSize(rememberCheckbox);
      const signUpSize = getElementSize(signUpLink);

      // Check text readability
      const emailStyles = emailField ? window.getComputedStyle(emailField) : null;
      const passwordStyles = passwordField ? window.getComputedStyle(passwordField) : null;

      const emailFontSize = emailStyles ? parseInt(emailStyles.fontSize) : 0;
      const passwordFontSize = passwordStyles ? parseInt(passwordStyles.fontSize) : 0;

      // Check form container width
      const formContainer = document.querySelector("form") || document.querySelector("div");
      const containerWidth = formContainer ? formContainer.getBoundingClientRect().width : 0;

      return {
        hasHorizontalScroll,
        signInButtonSize: signInSize,
        emailFieldSize: emailSize,
        passwordFieldSize: passwordSize,
        showPasswordSize: showPasswordSize,
        checkboxSize: checkboxSize,
        signUpLinkSize: signUpSize,
        emailFontSize,
        passwordFontSize,
        containerWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    // Verify no horizontal scrolling required
    expect(tabletLayout.hasHorizontalScroll).toBe(false);

    // Verify viewport is correctly set to tablet size
    expect(tabletLayout.viewportWidth).toBe(768);
    expect(tabletLayout.viewportHeight).toBe(1024);

    // Verify main interactive elements meet touch target guidelines (44px minimum for tablets)
    expect(tabletLayout.signInButtonSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.emailFieldSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.passwordFieldSize.height).toBeGreaterThanOrEqual(44);

    // Verify text is readable (16px minimum to prevent zoom)
    expect(tabletLayout.emailFontSize).toBeGreaterThanOrEqual(16);
    expect(tabletLayout.passwordFontSize).toBeGreaterThanOrEqual(16);

    // 2. Test form interactions on tablet

    // Test form field interactions
    await page.getByRole("textbox", { name: "Email *" }).fill("tablet.test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("tabletPassword123");

    // Verify form content is entered correctly
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(
      "tablet.test@example.com",
    );
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(
      "tabletPassword123",
    );

    // Test button interactions
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify error message appears (using test credentials)
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    // Verify form remains usable after interaction
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

    // Verify layout remains stable after interactions
    const postInteractionLayout = await page.evaluate(() => {
      const hasHorizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const containerWidth = document.querySelector("form")
        ? document.querySelector("form").getBoundingClientRect().width
        : document.querySelector("div").getBoundingClientRect().width;

      return {
        hasHorizontalScrollAfterInteraction: hasHorizontalScroll,
        containerWidthAfterInteraction: containerWidth,
      };
    });

    expect(postInteractionLayout.hasHorizontalScrollAfterInteraction).toBe(false);
    expect(postInteractionLayout.containerWidthAfterInteraction).toBeGreaterThan(0);
  });
});
