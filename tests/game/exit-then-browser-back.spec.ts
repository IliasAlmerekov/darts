import { test, expect } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { fulfillJson, mockGameState } from "../shared/game-route-mocks";
import { navigateInApp } from "../shared/in-app-navigation";
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

test.describe("Leaving the game with the browser Back button while End Game runs", () => {
  test("should not create a rematch or open its lobby when the abort answers after Back", async ({
    page,
  }) => {
    await mockAdminSession(page);
    await mockTabletGame(page, startedTabletGame(GAME_ID));
    await mockQuietRoomStream(page);

    await mockGameState(page, GAME_ID, startedGame);

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

    // A request the page sends after the abort answer. The page sends it last, so its route
    // has run only after every earlier request's route has.
    await page.route("**/api/__settled", (route) => route.fulfill({ status: 204 }));

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
    await navigateInApp(page, `/game/${GAME_ID}`);
    await expect(page.getByRole("button", { name: "Back to Home" })).toBeVisible();

    await page.getByRole("button", { name: "Back to Home" }).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect.poll(() => abortRequested).toBe(true);

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();

    const abortResponse = page.waitForResponse(`**/api/game/${GAME_ID}/abort`);
    releaseAbort();
    await (await abortResponse).finished();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    // The hook goes from the abort answer to the rematch request in microtasks only, so a
    // continuing exit has fetched the rematch before this request. Its route handler has run
    // by the time this evaluate returns, so the check below cannot run too early.
    await page.evaluate(() => fetch("/api/__settled").then(() => undefined));

    expect(rematchRequests).toEqual([]);
  });
});
