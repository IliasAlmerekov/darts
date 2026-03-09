// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Tablet Layout", async ({ page }) => {
    await mockFailedLogin(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("http://localhost:5173/");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    const tabletLayout = await page.evaluate(() => {
      const hasHorizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth;

      const signInButton =
        document.querySelector('button[type="submit"]') || document.querySelector("button");
      const emailField = document.querySelector('input[type="email"]');
      const passwordField = document.querySelector('input[type="password"]');
      const showPasswordBtn =
        document.querySelector('button[aria-label*="password"], button[title*="password"]') ||
        document.querySelectorAll("button")[1];
      const rememberCheckbox = document.querySelector('input[type="checkbox"]');
      const signUpLink = document.querySelector('a[href="/register"]');

      const getElementSize = (element) => {
        if (!element) return { width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };

      const signInSize = getElementSize(signInButton);
      const emailSize = getElementSize(emailField);
      const passwordSize = getElementSize(passwordField);
      const showPasswordSize = getElementSize(showPasswordBtn);
      const checkboxSize = getElementSize(rememberCheckbox);
      const signUpSize = getElementSize(signUpLink);

      const emailStyles = emailField ? window.getComputedStyle(emailField) : null;
      const passwordStyles = passwordField ? window.getComputedStyle(passwordField) : null;

      const emailFontSize = emailStyles ? parseInt(emailStyles.fontSize) : 0;
      const passwordFontSize = passwordStyles ? parseInt(passwordStyles.fontSize) : 0;

      const formContainer = document.querySelector("form") || document.querySelector("div");
      const containerWidth = formContainer ? formContainer.getBoundingClientRect().width : 0;

      return {
        hasHorizontalScroll,
        signInButtonSize: signInSize,
        emailFieldSize: emailSize,
        passwordFieldSize: passwordSize,
        showPasswordSize,
        checkboxSize,
        signUpLinkSize: signUpSize,
        emailFontSize,
        passwordFontSize,
        containerWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(tabletLayout.hasHorizontalScroll).toBe(false);
    expect(tabletLayout.viewportWidth).toBe(768);
    expect(tabletLayout.viewportHeight).toBe(1024);
    expect(tabletLayout.signInButtonSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.emailFieldSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.passwordFieldSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.emailFontSize).toBeGreaterThanOrEqual(16);
    expect(tabletLayout.passwordFontSize).toBeGreaterThanOrEqual(16);

    await page.getByRole("textbox", { name: "Email *" }).fill("tablet.test@example.com");
    await page.getByRole("textbox", { name: "Password *" }).fill("tabletPassword123");

    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveValue(
      "tablet.test@example.com",
    );
    await expect(page.getByRole("textbox", { name: "Password *" })).toHaveValue(
      "tabletPassword123",
    );

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Password *" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

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
