import { test, expect, type Route } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockQuietRoomStream } from "../shared/room-stream-mocks";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

const GAME_ID = 1;
const REMATCH_ID = 2;

const player = (id: number, name: string, isActive: boolean) => ({
  id,
  name,
  score: 301,
  isActive,
  isBust: false,
  isGuest: false,
  position: null,
  throwsInCurrentRound: 0,
  currentRoundThrows: [],
  roundHistory: [],
});

const startedGame = {
  id: GAME_ID,
  status: "started",
  currentRound: 1,
  activePlayerId: 1,
  currentThrowCount: 0,
  winnerId: null,
  settings: { startScore: 301, doubleOut: false, tripleOut: false },
  players: [player(1, "Alice", true), player(2, "Bob", false)],
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test.describe("Leaving the game with the browser Back button while End Game runs", () => {
  test("should not create a rematch or open its lobby when the abort answers after Back", async ({
    page,
  }) => {
    await mockAdminSession(page);
    await mockTabletGame(page, startedTabletGame(GAME_ID));
    await mockQuietRoomStream(page);

    await page.route(`**/api/game/${GAME_ID}`, async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      await fulfillJson(route, startedGame);
    });

    let releaseAbort: () => void = () => {};
    const abortReleased = new Promise<void>((resolve) => {
      releaseAbort = resolve;
    });
    let abortRequested = false;
    await page.route(`**/api/game/${GAME_ID}/abort`, async (route) => {
      abortRequested = true;
      await abortReleased;
      await fulfillJson(route, { success: true, message: "Game aborted" });
    });

    const rematchRequests: string[] = [];
    await page.route(`**/api/room/${GAME_ID}/rematch`, async (route) => {
      rematchRequests.push(route.request().method());
      await fulfillJson(route, {
        success: true,
        gameId: REMATCH_ID,
        invitationLink: "/join/abc",
      });
    });

    // A page the app can return to with Back; the game opens on top of it in the same SPA history.
    await page.goto("/start/abc");
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await page.evaluate((path) => {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/game/${GAME_ID}`);
    await expect(page.getByRole("button", { name: "Back to Home" })).toBeVisible();

    await page.getByRole("button", { name: "Back to Home" }).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect.poll(() => abortRequested).toBe(true);

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();

    releaseAbort();
    // Give a wrongly continuing exit time to send the rematch and navigate.
    await page.waitForTimeout(500);

    expect(rematchRequests).toEqual([]);
    await expect(page).not.toHaveURL(new RegExp(`/start/${REMATCH_ID}$`));
    await expect(page).toHaveURL(/\/start\/abc$/);
  });
});
