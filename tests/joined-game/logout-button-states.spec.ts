// spec: specs/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

test("Verify logout button states", async ({ page }) => {
  // Mock the login success check to return authenticated user with roles
  let loggedOut = false;
  await page.route("**/api/login/success", async (route) => {
    if (!loggedOut) {
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
      return;
    }
    await route.fulfill({ status: 401 });
  });

  // Create a promise that will be resolved when we're ready to let the logout complete
  let resolveLogout: () => void;
  const logoutGate = new Promise<void>((resolve) => {
    resolveLogout = resolve;
  });

  // Mock the logout API with a gate to control when it completes
  await page.route("**/api/logout", async (route) => {
    loggedOut = true;
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

  // Use a locator that works for both button states - get the button in the form footer
  const logoutButton = page.locator("button").filter({ hasText: /logout|loging out/i });
  await expect(logoutButton).toBeVisible();
  await expect(logoutButton).toBeEnabled();

  // Verify button displays 'logout' text
  await expect(logoutButton).toContainText(/logout/i);

  // Verify button has classes 'btn' and 'btnPrimary'
  const buttonClasses = await logoutButton.getAttribute("class");
  expect(buttonClasses).toContain("btn");
  expect(buttonClasses).toContain("btnPrimary");

  // Verify button is not disabled
  await expect(logoutButton).toBeEnabled();

  // Click the logout button (don't await immediately to observe loading state)
  await logoutButton.click();

  // Verify button immediately becomes disabled
  await expect(logoutButton).toBeDisabled({ timeout: 2000 });

  // Verify button text changes to 'loging out...'
  await expect(logoutButton).toContainText(/loging out/i);

  // Now let the logout complete
  resolveLogout!();

  // Verify redirect to login page with success message
  await page.waitForURL(/\/\?left=1$/);
  await expect(page.getByText("Sie haben das Spiel erfolgreich verlassen")).toBeVisible();
});
