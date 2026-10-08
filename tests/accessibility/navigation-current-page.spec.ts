import { test, expect, type Locator, type Page } from "@playwright/test";

const mockAdminSession = async (page: Page): Promise<void> => {
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

const mockEmptyStatistics = async (page: Page): Promise<void> => {
  const emptyPage = JSON.stringify({ limit: 10, offset: 0, total: 0, items: [] });

  await page.route("**/api/players/stats**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: emptyPage });
  });
  await page.route("**/api/games/overview**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: emptyPage });
  });
};

const tabUntilFocused = async (page: Page, target: Locator): Promise<void> => {
  for (let step = 0; step < 30; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
};

test.describe("Navigation current page", () => {
  test("exposes the current page through keyboard and Back navigation", async ({ page }) => {
    await mockAdminSession(page);
    await mockEmptyStatistics(page);
    await page.goto("/start");

    const mainNav = page.getByRole("navigation", { name: "Main" });
    const statisticsLink = mainNav.getByRole("link", { name: "Statistics", exact: true });
    const gameLink = mainNav.getByRole("link", { name: "Game", exact: true });
    await expect(gameLink).toHaveAttribute("aria-current", "page");
    await expect(statisticsLink).not.toHaveAttribute("aria-current");

    await tabUntilFocused(page, statisticsLink);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/statistics$/);
    await expect(statisticsLink).toHaveAttribute("aria-current", "page");
    await expect(gameLink).not.toHaveAttribute("aria-current");

    const viewNav = page.getByRole("navigation", { name: "Statistics view" });
    const playersLink = viewNav.getByRole("link", { name: "Players" });
    const gamesLink = viewNav.getByRole("link", { name: "Games" });
    await expect(playersLink).toHaveAttribute("aria-current", "page");

    await tabUntilFocused(page, gamesLink);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/gamesoverview$/);
    await expect(gamesLink).toHaveAttribute("aria-current", "page");
    await expect(playersLink).not.toHaveAttribute("aria-current");

    await page.goBack();

    await expect(page).toHaveURL(/\/statistics$/);
    await expect(playersLink).toHaveAttribute("aria-current", "page");
    await expect(gamesLink).not.toHaveAttribute("aria-current");

    await page.goBack();

    await expect(page).toHaveURL(/\/start$/);
    await expect(gameLink).toHaveAttribute("aria-current", "page");
    await expect(statisticsLink).not.toHaveAttribute("aria-current");
  });
});
