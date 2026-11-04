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

      // The name's grid cell never overlaps the average; its text can spill out of it.
      const longNameRow = page.locator('[class*="playerRow"]').filter({ hasText: LONG_NAME });
      await expect(longNameRow.getByRole("group", { name: "three-dart average" })).toContainText(
        "100.00",
      );
      const { nameText, average } = await longNameRow.evaluate((row) => {
        const name = row.querySelector('[class*="playerName"]');
        const averageGroup = row.querySelector('[aria-label="three-dart average"]');
        if (!name || !averageGroup) throw new Error("name or average missing in the row");
        const range = document.createRange();
        range.selectNodeContents(name);
        const toBox = ({ left, right, top, bottom }: DOMRect) => ({ left, right, top, bottom });
        return {
          nameText: toBox(range.getBoundingClientRect()),
          average: toBox(averageGroup.getBoundingClientRect()),
        };
      });
      const overlaps =
        nameText.left < average.right &&
        average.left < nameText.right &&
        nameText.top < average.bottom &&
        average.top < nameText.bottom;
      // Soft, so one run reports every width that overlaps.
      expect
        .soft(
          overlaps,
          `${viewport.name}: name text ${JSON.stringify(nameText)}, average ${JSON.stringify(average)}`,
        )
        .toBe(false);
    }
  });
});
