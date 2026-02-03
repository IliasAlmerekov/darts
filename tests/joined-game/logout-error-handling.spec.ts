// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Handle logout API errors gracefully", async ({ page }) => {
  // Mock the login success check to return authenticated user with roles
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
        id: 1,
        username: "testuser",
        redirect: "/start",
      }),
    });
  });

  // Create a promise that will be resolved when we're ready to let the logout complete
  let resolveLogout: () => void;
  const logoutGate = new Promise<void>((resolve) => {
    resolveLogout = resolve;
  });

  // Mock the /api/logout endpoint to return a 500 error
  await page.route("**/api/logout", async (route) => {
    await logoutGate;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  // Navigate directly to /joined (no login needed since we mock auth)
  await page.goto("/joined");
  await page.waitForLoadState("domcontentloaded");

  // Verify user is on the joined game page
  await expect(page.locator("h1")).toContainText("Spiel beigetreten");

  // Set up console monitoring to catch logged errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Use a locator that works for both button states
  const logoutButton = page.locator("button").filter({ hasText: /logout|loging out/i });
  await logoutButton.click();

  // Verify button shows loading state 'loging out...'
  await expect(logoutButton).toContainText(/loging out/i, { timeout: 2000 });
  await expect(logoutButton).toBeDisabled();

  // Now let the logout complete (with error)
  resolveLogout!();

  // Wait for error handling to complete
  await page.waitForTimeout(500);

  // Verify the error is caught and logged to console
  expect(
    consoleErrors.some(
      (error) =>
        error.toLowerCase().includes("logout") ||
        error.toLowerCase().includes("500") ||
        error.toLowerCase().includes("error"),
    ),
  ).toBeTruthy();

  // Verify button returns to enabled state after error
  await expect(logoutButton).toBeEnabled({ timeout: 5000 });

  // Verify page remains functional despite error
  await expect(page.locator("h1")).toContainText("Spiel beigetreten");
  await expect(logoutButton).toContainText(/logout/i);
  await expect(logoutButton).not.toContainText(/loging out/i);

  // Verify the page is still interactive
  await expect(logoutButton).toBeVisible();
});
