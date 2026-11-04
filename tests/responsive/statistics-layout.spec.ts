import { test, expect, type Page } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockMissingAvatars } from "../shared/player-profile-mocks";

const LONG_NAME = "Maximilian Oberhausen-Schwarzenberg";

const viewports = [
  { name: "phone-320", width: 320, height: 640 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-601", width: 601, height: 900 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
];

const mockPlayerStats = async (page: Page): Promise<void> => {
  await page.route("**/api/players/stats**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        limit: 10,
        offset: 0,
        total: 2,
        items: [
          { playerId: 1, name: LONG_NAME, gamesPlayed: 128, scoreAverage: 100 },
          { playerId: 2, name: "Anna", gamesPlayed: 7, scoreAverage: 45.3 },
        ],
      }),
    });
  });
};

test.describe("Responsive Statistics layout", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminSession(page);
    await mockPlayerStats(page);
    await mockMissingAvatars(page);
  });

  test("Player rows stay inside the screen without horizontal scroll", async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/statistics");
      await expect(page.getByText(LONG_NAME)).toBeVisible();
      await expect(page.getByText("Anna")).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await expect(hasHorizontalScroll, `${viewport.name} should not overflow`).toBe(false);

      // The admin layout clips its content, so a too-wide row never scrolls the document.
      const listOverflows = await page
        .locator('[class*="playerList"]')
        .evaluate((list) => list.scrollWidth > list.clientWidth + 1);
      await expect(listOverflows, `${viewport.name} rows should stay inside the list`).toBe(false);
    }
  });

  test("The average stays clear of a long name on a 320px phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/statistics");

    const name = page.getByText(LONG_NAME);
    const average = page.getByRole("group", { name: "three-dart average" }).first();
    await expect(average).toContainText("100.00");

    const [nameBox, averageBox] = await Promise.all([name.boundingBox(), average.boundingBox()]);
    expect(nameBox).not.toBeNull();
    expect(averageBox).not.toBeNull();
    if (nameBox && averageBox) {
      const overlaps =
        nameBox.x < averageBox.x + averageBox.width &&
        averageBox.x < nameBox.x + nameBox.width &&
        nameBox.y < averageBox.y + averageBox.height &&
        averageBox.y < nameBox.y + nameBox.height;
      expect(
        overlaps,
        `name ${JSON.stringify(nameBox)}, average ${JSON.stringify(averageBox)}`,
      ).toBe(false);
    }
  });
});
