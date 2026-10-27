import { test, expect } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockGameState } from "../shared/game-route-mocks";
import { fulfillJson } from "../shared/json-response";
import { navigateInApp } from "../shared/in-app-navigation";
import { mockQuietRoomStream } from "../shared/room-stream-mocks";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

declare global {
  interface Window {
    __abortJsonRead?: boolean;
  }
}

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

    // A request the spec sends from the page after the abort body is read; see the settle
    // step below.
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

    // Marks the moment the page's JS has read the abort body. The marker is set from a timeout, which
    // runs after every microtask chained from the body read: the API client's validation, the
    // hook's guard and its rematch request are all microtasks, with no task break in between.
    await page.addInitScript((abortPath) => {
      const readJson = Response.prototype.json;
      Response.prototype.json = function json(this: Response) {
        const body = readJson.call(this);
        if (new URL(this.url).pathname === abortPath) {
          void body.then(() =>
            setTimeout(() => {
              window.__abortJsonRead = true;
            }, 0),
          );
        }
        return body;
      };
    }, `/api/game/${GAME_ID}/abort`);

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

    releaseAbort();
    await page.waitForFunction(() => window.__abortJsonRead === true);
    // The marker proves the page read the abort body and ran its microtasks, so a continuing
    // exit has called fetch for the rematch. This request is sent after it, and its route runs
    // after the rematch route, so the rematch handler has run when this evaluate returns.
    await page.evaluate(() => fetch("/api/__settled").then(() => undefined));

    expect(rematchRequests).toEqual([]);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page).toHaveURL(/\/start\/abc$/);
  });
});
