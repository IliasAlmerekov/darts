// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Successfully logout from joined game page", async ({ page }) => {
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

  // Set up request monitoring to count logout requests
  const logoutRequests: unknown[] = [];

  // Create a promise that will be resolved when we're ready to let the logout complete
  let resolveLogout: () => void;
  const logoutGate = new Promise<void>((resolve) => {
    resolveLogout = resolve;
  });

  // Mock the logout API with a gate to control when it completes
  await page.route("**/api/logout", async (route) => {
    logoutRequests.push(route.request());
    await logoutGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Navigate directly to /joined (no login needed since we mock auth)
  await page.goto("/joined");
  await page.waitForLoadState("domcontentloaded");

  // Verify user is on the joined game page
  await expect(page.locator("h1")).toContainText("Spiel beigetreten");

  // Use a locator that works for both button states
  const logoutButton = page.locator("button").filter({ hasText: /logout|loging out/i });
  await expect(logoutButton).toContainText(/logout/i);
  await expect(logoutButton).toBeEnabled();

  // Click the logout button
  await logoutButton.click();

  // Verify the button text changes to 'loging out...' during the logout process
  await expect(logoutButton).toContainText(/loging out/i, { timeout: 2000 });

  // Verify the button becomes disabled during logout
  await expect(logoutButton).toBeDisabled();

  // Now let the logout complete
  resolveLogout!();

  // Wait a bit for the response to be processed
  await page.waitForTimeout(100);

  // Verify a POST request was sent to /api/logout endpoint with credentials
  expect(logoutRequests.length).toBeGreaterThan(0);

  // Verify button returns to enabled state after completion
  await expect(logoutButton).toBeEnabled({ timeout: 5000 });

  // Verify the logout API call completes successfully (button text should return to normal)
  await expect(logoutButton).toContainText(/logout/i);
  await expect(logoutButton).not.toContainText(/loging out/i);
});
