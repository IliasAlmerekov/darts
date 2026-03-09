// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect, type Locator } from "@playwright/test";
import { mockFailedLogin } from "../shared/auth-route-mocks";

type ElementSize = {
  width: number;
  height: number;
};

const getElementSize = async (locator: Locator): Promise<ElementSize> => {
  const box = await locator.boundingBox();

  return box ? { width: box.width, height: box.height } : { width: 0, height: 0 };
};

const getFontSize = async (locator: Locator): Promise<number> => {
  return locator.evaluate((element) =>
    Number.parseInt(window.getComputedStyle(element).fontSize, 10),
  );
};

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

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    const signInButtonSize = await getElementSize(signInButton);
    const emailFieldSize = await getElementSize(emailField);
    const passwordFieldSize = await getElementSize(passwordField);
    const emailFontSize = await getFontSize(emailField);
    const passwordFontSize = await getFontSize(passwordField);
    const loginFormSize = await getElementSize(loginForm);

    const tabletLayout = {
      hasHorizontalScroll,
      signInButtonSize,
      emailFieldSize,
      passwordFieldSize,
      emailFontSize,
      passwordFontSize,
      containerWidth: loginFormSize.width,
      viewportWidth: page.viewportSize()?.width ?? 0,
      viewportHeight: page.viewportSize()?.height ?? 0,
    };

    expect(tabletLayout.hasHorizontalScroll).toBe(false);
    expect(tabletLayout.viewportWidth).toBe(768);
    expect(tabletLayout.viewportHeight).toBe(1024);
    expect(tabletLayout.signInButtonSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.emailFieldSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.passwordFieldSize.height).toBeGreaterThanOrEqual(44);
    expect(tabletLayout.emailFontSize).toBeGreaterThanOrEqual(16);
    expect(tabletLayout.passwordFontSize).toBeGreaterThanOrEqual(16);

    await emailField.fill("tablet.test@example.com");
    await passwordField.fill("tabletPassword123");

    await expect(emailField).toHaveValue("tablet.test@example.com");
    await expect(passwordField).toHaveValue("tabletPassword123");

    await signInButton.click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(emailField).toBeEnabled();
    await expect(passwordField).toBeEnabled();
    await expect(signInButton).toBeEnabled();

    const hasHorizontalScrollAfterInteraction = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    const loginFormSizeAfterInteraction = await getElementSize(loginForm);

    const postInteractionLayout = {
      hasHorizontalScrollAfterInteraction,
      containerWidthAfterInteraction: loginFormSizeAfterInteraction.width,
    };

    expect(postInteractionLayout.hasHorizontalScrollAfterInteraction).toBe(false);
    expect(postInteractionLayout.containerWidthAfterInteraction).toBeGreaterThan(0);
  });
});
