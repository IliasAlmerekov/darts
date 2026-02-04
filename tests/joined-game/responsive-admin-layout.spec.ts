import { test, expect, type Page } from "@playwright/test";

const viewports = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
];

const mockAuth = async (page: Page): Promise<void> => {
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
};

const mockGame = async (page: Page, gameId = 1): Promise<void> => {
  await page.route(`**/api/game/${gameId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: gameId,
        status: "started",
        currentRound: 1,
        activePlayerId: 1,
        currentThrowCount: 0,
        players: [
          {
            id: 1,
            name: "Alice",
            score: 301,
            isActive: true,
            isBust: false,
            position: 1,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [],
          },
          {
            id: 2,
            name: "Bob",
            score: 280,
            isActive: false,
            isBust: false,
            position: 2,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [],
          },
        ],
        winnerId: null,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      }),
    });
  });
};

test.describe("Responsive admin layouts", () => {
  test("Start page adapts without overflow", async ({ page }) => {
    await mockAuth(page);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/start");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
      await expect(page.getByText(/create game/i).first()).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);
    }
  });

  test("Game page adapts without overflow", async ({ page }) => {
    await mockAuth(page);
    await mockGame(page, 1);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/game/1");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('img[alt="Back to Home"]')).toBeVisible();
      await expect(page.locator('img[alt="Undo"]')).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);
    }
  });
});
