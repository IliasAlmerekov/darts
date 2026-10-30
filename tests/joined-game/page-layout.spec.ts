// spec: docs/test-plans/joined-game-test-plan.md
// seed: seed.spec.ts

import { test, expect } from "../shared/test";
import { lobbyCurrentGame, mockCurrentGame } from "../shared/current-game-mocks";

const viewports = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
];

test("Verify page layout and styling", async ({ page }) => {
  await mockCurrentGame(page, lobbyCurrentGame(42));
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

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/joined");
    await page.waitForLoadState("domcontentloaded");

    // Inspect the page structure and CSS classes
    const container = page.locator('[class*="loginContainer"], [class*="container"]').first();
    const card = page.locator('[class*="loginCard"], [class*="card"]').first();

    // Verify the page uses a centered card layout with maximum width constraints
    await expect(container).toBeVisible();

    // Verify the card is visible
    await expect(card).toBeVisible();

    // Verify the welcome message block is visible
    const successBox = page.getByText("Welcome, testuser!");
    await expect(successBox).toBeVisible();

    // Verify the heading is visible
    const title = page.getByRole("heading", { name: "Joined game" });
    await expect(title).toBeVisible();

    // Verify no logout button is shown on the joined confirmation page
    const logoutButton = page.locator("button").filter({ hasText: /logout/i });
    await expect(logoutButton).toHaveCount(0);

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);

    // Verify the profile link sits top right, on one line with the single-line title
    const titleBox = await title.boundingBox();
    const titleLineHeight = await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight),
    );
    const profileLinkBox = await page.getByRole("link", { name: "My profile" }).boundingBox();
    expect(titleBox, `${viewport.name} title box`).not.toBeNull();
    expect(profileLinkBox, `${viewport.name} profile link box`).not.toBeNull();
    if (titleBox !== null && profileLinkBox !== null) {
      expect(profileLinkBox.x, `${viewport.name} link right of title`).toBeGreaterThanOrEqual(
        titleBox.x + titleBox.width,
      );
      expect(profileLinkBox.y, `${viewport.name} link on the title row`).toBeLessThan(
        titleBox.y + titleBox.height,
      );
      expect(titleBox.height, `${viewport.name} title on one line`).toBeLessThan(
        titleLineHeight * 1.5,
      );
    }
  }
});
