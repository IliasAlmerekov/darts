// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Display page for unauthenticated users", async ({ page }) => {
  // 1. Clear all authentication cookies
  await page.context().clearCookies();

  // Mock the login success check to return unauthenticated
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    });
  });

  // 2. Attempt to navigate to /joined route
  await page.goto("/joined");

  // Wait for redirect to complete
  await page.waitForLoadState("domcontentloaded");

  // Clear storage after navigating to a page
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate again to /joined to trigger the redirect
  await page.goto("/joined");
  await page.waitForLoadState("domcontentloaded");

  // Verify user is redirected to the login page (/)
  await expect(page).toHaveURL("/");

  // Verify the joined game confirmation page is not displayed
  await expect(page.locator("h1")).not.toContainText("Spiel beigetreten");

  // Verify we're on the login page instead
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
});
