import { test, expect } from "../shared/test";
import {
  mockRememberedPlayerSession,
  REMEMBERED_PLAYER_RESPONSE,
} from "../shared/auth-route-mocks";
import { mockPlayerProfile, PLAYER_PROFILE } from "../shared/player-profile-mocks";

/** Body of `GET /api/player/7/profile`: Anna, the other registered player in the history. */
const ANNA_PUBLIC_PROFILE = {
  playerId: 7,
  displayName: "Anna",
  stats: PLAYER_PROFILE.stats,
};

test.describe("Public profile", () => {
  test("a player opens another player's Public profile from History and goes back", async ({
    page,
  }) => {
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      redirect: "/playerprofile",
    });
    await mockPlayerProfile(page);
    await page.route("**/api/player/7/profile", (route) =>
      route.fulfill({ json: ANNA_PUBLIC_PROFILE }),
    );

    await page.goto("/playerprofile?tab=history");
    const games = page.getByRole("list", { name: "Recent games" });
    await expect(games.getByRole("link")).toHaveText(["1. Anna"]);
    await games.getByRole("link", { name: "1. Anna" }).click();

    await expect(page).toHaveURL("/playerprofile/7");
    await expect(page.getByRole("heading", { level: 1, name: "Anna's profile" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Games played" })).toContainText(
      String(PLAYER_PROFILE.stats.gamesPlayed),
    );
    await expect(page.getByRole("region", { name: "Hit distribution" })).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Member since" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to my profile" }).click();

    await expect(page).toHaveURL("/playerprofile");
    await expect(page.getByRole("heading", { level: 1, name: "Player Profile" })).toBeVisible();
  });

  test("a logged-in admin cannot open a Public profile", async ({ page }) => {
    await page.route("**/api/login/success", (route) =>
      route.fulfill({
        json: {
          success: true,
          roles: ["ROLE_ADMIN"],
          id: 1,
          username: "admin",
          redirect: "/start",
        },
      }),
    );
    const publicProfileReads: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/player/7/profile") {
        publicProfileReads.push(request.url());
      }
    });

    await page.goto("/playerprofile/7");

    await expect(page).toHaveURL("/start");
    await expect(page.getByRole("heading", { name: "Selected Players" })).toBeVisible();
    expect(publicProfileReads).toEqual([]);
  });
});
