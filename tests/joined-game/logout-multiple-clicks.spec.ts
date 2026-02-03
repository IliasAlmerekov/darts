// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Prevent multiple simultaneous logout requests", async ({ page }) => {
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
  await logoutButton.click();

  // Verify button becomes disabled
  await expect(logoutButton).toBeDisabled({ timeout: 2000 });

  // Verify first logout request is initiated
  await expect(logoutButton).toContainText(/loging out/i);

  // Attempt to click the logout button again while it's disabled
  // Try multiple rapid clicks to test race conditions
  const clickPromises = [];
  for (let i = 0; i < 3; i++) {
    clickPromises.push(
      logoutButton.click({ force: true, timeout: 1000 }).catch(() => {
        // Expected to fail due to disabled state
      }),
    );
  }
  await Promise.all(clickPromises);

  // Wait for any potential duplicate requests to be made
  await page.waitForTimeout(200);

  // Verify button click is prevented by disabled attribute
  // The button should still be disabled and showing loading text
  await expect(logoutButton).toBeDisabled();
  await expect(logoutButton).toContainText(/loging out/i);

  // Verify only one /api/logout request is made (before completing)
  expect(logoutRequests.length).toBe(1);

  // Now let the logout complete
  resolveLogout!();

  // Wait a bit for the response to be processed
  await page.waitForTimeout(100);

  // Verify no additional logout requests were sent
  const finalRequestCount = logoutRequests.length;
  expect(finalRequestCount).toBe(1);
});
