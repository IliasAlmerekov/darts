// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

test.describe("Cross-Browser and Responsive Tests", () => {
  test("Tablet Layout", async ({ page }) => {
    await mockFailedLogin(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("http://localhost:5173/");

    const signInHeading = page.getByRole("heading", { name: "Sign in" });
    const emailField = page.getByRole("textbox", { name: "Email *" });
    const passwordField = page.getByRole("textbox", { name: "Password *" });
    const signInButton = page.getByRole("button", { name: "Sign in" });
    const showPasswordButton = page.getByRole("button", { name: "Show password" });
    const rememberCheckbox = page.getByRole("checkbox", { name: "Remember me" });
    const signUpLink = page.getByRole("link", { name: "Sign up" });
    const loginForm = page.getByTestId("login-form");

    await expect(signInHeading).toBeVisible();
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(signInButton).toBeVisible();
    await expect(showPasswordButton).toBeVisible();
    await expect(rememberCheckbox).toBeVisible();
    await expect(signUpLink).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(768);
    expect(viewport?.height).toBe(1024);

    const [signInBox, emailBox, passwordBox, loginFormBox] = await Promise.all([
      signInButton.boundingBox(),
      emailField.boundingBox(),
      passwordField.boundingBox(),
      loginForm.boundingBox(),
    ]);

    expect(signInBox?.height).toBeGreaterThanOrEqual(44);
    expect(emailBox?.height).toBeGreaterThanOrEqual(44);
    expect(passwordBox?.height).toBeGreaterThanOrEqual(44);
    expect(loginFormBox?.width).toBeGreaterThan(0);

    const emailFontSize = await emailField.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    const passwordFontSize = await passwordField.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(emailFontSize).toBeGreaterThanOrEqual(16);
    expect(passwordFontSize).toBeGreaterThanOrEqual(16);

    await emailField.fill("tablet.test@example.com");
    await passwordField.fill("tabletPassword123");

    await expect(emailField).toHaveValue("tablet.test@example.com");
    await expect(passwordField).toHaveValue("tabletPassword123");

    await signInButton.click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(emailField).toBeEnabled();
    await expect(passwordField).toBeEnabled();
    await expect(signInButton).toBeEnabled();

    const hasHorizontalScrollAfterInteraction = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScrollAfterInteraction).toBe(false);

    const loginFormBoxAfterInteraction = await loginForm.boundingBox();
    expect(loginFormBoxAfterInteraction?.width).toBeGreaterThan(0);
  });
});
