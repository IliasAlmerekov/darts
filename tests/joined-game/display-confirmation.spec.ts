// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Successfully display joined game confirmation page", async ({ page }) => {
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

  // Navigate directly to the /joined route (no login needed since we mock auth)
  await page.goto("/joined");

  // Wait for the page to load
  await page.waitForLoadState("domcontentloaded");

  // Verify the joined game confirmation page loads successfully
  await expect(page).toHaveURL(/.*\/joined/);

  // Verify the page displays the heading '✓ Spiel beigetreten!'
  await expect(page.locator("h1")).toContainText("Spiel beigetreten");

  // Verify welcome message 'Willkommen im Spiel!' is visible
  await expect(page.locator("h3").filter({ hasText: "Willkommen im Spiel" })).toBeVisible();

  // Verify no logout button is shown on the joined confirmation page
  const logoutButton = page.locator("button").filter({ hasText: /logout/i });
  await expect(logoutButton).toHaveCount(0);
});
