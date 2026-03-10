// spec: specs/login-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect, type Locator } from "@playwright/test";

test.describe("Accessibility and Usability", () => {
  test("Visual Focus Indicators", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    const emailField = page.getByRole("textbox", { name: "Email *" });
    await expect(emailField).toBeEnabled();
    await page.locator("body").click({ position: { x: 1, y: 1 } });

    await page.keyboard.press("Tab");
    await expect(emailField).toBeFocused();
    await expect(emailField).toBeVisible();

    const emailHasFocusIndicator = await emailField.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.outlineStyle !== "none" ||
        styles.boxShadow !== "none" ||
        styles.borderColor.includes("rgb(0, 0, 219)")
      );
    });
    expect(emailHasFocusIndicator).toBe(true);

    const passwordField = page.getByLabel("Password *");
    await page.keyboard.press("Tab");
    await expect(passwordField).toBeFocused();

    const showPasswordButton = page.getByRole("button", { name: "Show password" });
    await page.keyboard.press("Tab");
    await expect(showPasswordButton).toBeFocused();
    await expect(showPasswordButton).toBeVisible();

    const buttonHasFocusIndicator = await showPasswordButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.outlineStyle !== "none" ||
        styles.outlineStyle === "auto" ||
        styles.boxShadow !== "none"
      );
    });
    expect(buttonHasFocusIndicator).toBe(true);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

    const allFocusableElements: Locator[] = [
      emailField,
      passwordField,
      page.getByRole("button", { name: "Show password" }),
      page.getByRole("checkbox", { name: "Remember me" }),
      page.getByRole("button", { name: "Sign in" }),
      page.getByRole("link", { name: "Sign up" }),
    ];

    for (const element of allFocusableElements) {
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
    }

    // Verify form inputs and interactive elements carry visible styling
    // (matches original selector set: email, password, show-password button, checkbox, link)
    const styledElements = [
      emailField,
      passwordField,
      page.getByRole("button", { name: "Show password" }),
      page.getByRole("checkbox", { name: "Remember me" }),
      page.getByRole("link", { name: "Sign up" }),
    ];

    for (const element of styledElements) {
      const hasFocusStyle = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const hasVisibleOutline =
          styles.outline !== "none" && styles.outlineColor !== "transparent";
        const hasVisibleBoxShadow = styles.boxShadow !== "none";
        const hasVisibleBorder = styles.borderWidth !== "0px";
        return hasVisibleOutline || hasVisibleBoxShadow || hasVisibleBorder;
      });
      expect(hasFocusStyle).toBe(true);
    }
  });
});
