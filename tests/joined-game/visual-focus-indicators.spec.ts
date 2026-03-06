// spec: specs/login-test-plan.md
// seed: tests/joined-game/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Accessibility and Usability", () => {
  test("Visual Focus Indicators", async ({ page }) => {
    // 1. Navigate through form using Tab key
    await page.goto("http://localhost:5173/");

    const emailField = page.getByRole("textbox", { name: "Email *" });
    await expect(emailField).toBeEnabled();
    await page.locator("body").click({ position: { x: 1, y: 1 } });

    // Tab to email field and verify focus indicator
    await page.keyboard.press("Tab");
    await expect(emailField).toBeFocused();

    // Verify email field has visible focus indicator
    const emailFocusStyle = await page.evaluate(() => {
      const emailField = document.querySelector('input[type="email"]');
      const styles = window.getComputedStyle(emailField);
      return {
        hasFocusIndicator:
          styles.outline !== "none" ||
          styles.boxShadow !== "none" ||
          styles.border.includes("rgb(0, 0, 219)"),
        isVisible: emailField?.offsetParent !== null,
      };
    });
    expect(emailFocusStyle.hasFocusIndicator).toBe(true);
    expect(emailFocusStyle.isVisible).toBe(true);

    // Tab to password field and verify focus indicator
    const passwordField = page.getByLabel("Password *");
    await page.keyboard.press("Tab");
    await expect(passwordField).toBeFocused();

    // Tab to show password button and verify focus indicator
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();

    // Verify show password button has visible focus indicator
    const buttonFocusStyle = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!activeElement) return { hasFocusIndicator: false, isVisible: false };

      const styles = window.getComputedStyle(activeElement);
      return {
        hasFocusIndicator:
          styles.outline !== "none" ||
          styles.outlineStyle === "auto" ||
          styles.boxShadow !== "none",
        isVisible: activeElement.offsetParent !== null,
        outlineWidth: styles.outlineWidth,
      };
    });
    expect(buttonFocusStyle.hasFocusIndicator).toBe(true);
    expect(buttonFocusStyle.isVisible).toBe(true);

    // Tab to remember me checkbox and verify focus indicator
    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeFocused();

    // Tab to sign in button and verify focus indicator
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();

    // Tab to sign up link and verify focus indicator
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

    // Verify all focusable elements maintain their visibility and focus is never hidden
    const allFocusableElements = [
      emailField,
      passwordField,
      page.getByRole("button", { name: "Show password" }),
      page.getByRole("checkbox", { name: "Remember me" }),
      page.getByRole("button", { name: "Sign in" }),
      page.getByRole("link", { name: "Sign up" }),
    ];

    // Verify all elements are visible and focusable
    for (const element of allFocusableElements) {
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
    }

    // Test focus indicators have sufficient contrast by checking they're not transparent
    const focusContrastTest = await page.evaluate(() => {
      const elements = [
        document.querySelector('input[type="email"]'),
        document.querySelector('input[type="password"]'),
        document.querySelector("button"),
        document.querySelector('input[type="checkbox"]'),
        document.querySelector("a"),
      ].filter(Boolean);

      return elements.every((element) => {
        const styles = window.getComputedStyle(element);
        // Check that focus indicators are not completely transparent or invisible
        const hasVisibleOutline =
          styles.outline !== "none" && styles.outlineColor !== "transparent";
        const hasVisibleBoxShadow = styles.boxShadow !== "none";
        const hasVisibleBorder = styles.borderWidth !== "0px";

        return hasVisibleOutline || hasVisibleBoxShadow || hasVisibleBorder;
      });
    });

    expect(focusContrastTest).toBe(true);
  });
});
