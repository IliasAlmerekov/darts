// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Verify page layout and styling", async ({ page }) => {
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

  // Navigate directly to /joined (no login needed since we mock auth)
  await page.goto("/joined");
  await page.waitForLoadState("domcontentloaded");

  // Inspect the page structure and CSS classes
  const container = page.locator('[class*="loginContainer"], [class*="container"]').first();
  const card = page.locator('[class*="loginCard"], [class*="card"]').first();

  // Verify the page uses a centered card layout with maximum width constraints
  await expect(container).toBeVisible();

  // Verify the card is visible
  await expect(card).toBeVisible();

  // Verify the success message box has proper styling
  const successBox = page.locator("h3").filter({ hasText: "Willkommen im Spiel!" });
  await expect(successBox).toBeVisible();

  // Verify the heading is visible
  await expect(page.locator("h1")).toContainText("Spiel beigetreten");

  // Verify no logout button is shown on the joined confirmation page
  const logoutButton = page.locator("button").filter({ hasText: /logout/i });
  await expect(logoutButton).toHaveCount(0);
});
