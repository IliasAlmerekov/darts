import { test, expect } from "../shared/test";
import {
  mockRememberedPlayerSession,
  REMEMBERED_PLAYER_RESPONSE,
} from "../shared/auth-route-mocks";
import { mockPlayerProfile } from "../shared/player-profile-mocks";

test.describe("Player profile hit distribution", () => {
  test.beforeEach(async ({ page }) => {
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      redirect: "/playerprofile",
    });
    await mockPlayerProfile(page);
    await page.goto("/playerprofile");
  });

  test("the out rule filter switches the board and the most hit fields", async ({ page }) => {
    const block = page.getByRole("region", { name: "Hit distribution" });
    const topFields = block.getByRole("region", { name: "Most hit fields" });
    await expect(
      block.getByRole("group", { name: "Dartboard heatmap of all games" }),
    ).toBeVisible();
    await expect(topFields.getByRole("listitem")).toHaveCount(5);
    await expect(topFields.getByRole("listitem").first()).toHaveText("T2096 hits");

    await block.getByRole("button", { name: "Games in the hit distribution: All games" }).click();
    await page.getByRole("menuitem", { name: "Double-Out" }).click();

    await expect(
      block.getByRole("group", { name: "Dartboard heatmap of Double-Out games" }),
    ).toBeVisible();
    await expect(topFields.getByRole("listitem")).toHaveText(["T2060 hits"]);

    await block.getByRole("button", { name: "Games in the hit distribution: Double-Out" }).click();
    await page.getByRole("menuitem", { name: "Triple-Out" }).click();

    await expect(topFields).toContainText("No hits yet");
  });

  test("a sector opens its card by click and by keyboard", async ({ page }) => {
    const sector = page.getByRole("button", { name: "Sector 20" });

    await sector.click();
    const card = page.getByRole("dialog", { name: "Sector 20" });
    await expect(card).toContainText("120 hits");
    await expect(card.getByRole("listitem")).toHaveText([
      "Single 20: 12",
      "Double 20: 12",
      "Triple 20: 96",
    ]);

    // A click outside the board closes the card.
    await page.getByRole("heading", { level: 1, name: "Player Profile" }).click();
    await expect(card).toBeHidden();

    await page.getByRole("button", { name: "Bull" }).focus();
    await page.keyboard.press("Enter");
    const bull = page.getByRole("dialog", { name: "Bull" });
    await expect(bull.getByRole("listitem")).toHaveText(["Bull: 12", "Bullseye: 12"]);

    await page.keyboard.press("Escape");
    await expect(bull).toBeHidden();
    await expect(page.getByRole("button", { name: "Bull" })).toBeFocused();

    await page.keyboard.press("Space");
    await expect(bull).toBeVisible();
  });
});
