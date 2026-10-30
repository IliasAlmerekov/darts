import { test, expect } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockGameState } from "../shared/game-route-mocks";
import { fulfillJson } from "../shared/json-response";
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

    await page.route(`**/api/room/${GAME_ID}/rematch`, async (route) => {
      await fulfillJson(route, {
        success: true,
        gameId: REMATCH_ID,
        invitationLink: "/join/abc",
      });
    });

    // Two page-side probes, so the proof stays in the page's own event loop:
    // - a counter of fetch calls to the rematch endpoint;
    // - a marker set from a timeout after the abort body is read. That task runs after every
    //   microtask chained from the body read, and the hook reaches the rematch fetch in
    //   microtasks only (API client validation, the abort guard, createRematchGame). So the
    //   counter is final when the marker is set.
    await page.addInitScript(
      ({ abortPath, rematchPath }) => {
        Reflect.set(window, "__rematchFetches", 0);

        const readJson = Response.prototype.json;
        Response.prototype.json = function json(this: Response) {
          const body = readJson.call(this);
          if (this.url.endsWith(abortPath)) {
            void body.then(() =>
              setTimeout(() => {
                Reflect.set(window, "__abortJsonRead", true);
              }, 0),
            );
          }
          return body;
        };

        const callFetch = window.fetch;
        window.fetch = function countedFetch(input, init) {
          const url = input instanceof Request ? input.url : String(input);
          if (url.endsWith(rematchPath)) {
            Reflect.set(
              window,
              "__rematchFetches",
              Number(Reflect.get(window, "__rematchFetches")) + 1,
            );
          }
          return callFetch.call(window, input, init);
        };
      },
      { abortPath: `/api/game/${GAME_ID}/abort`, rematchPath: `/api/room/${GAME_ID}/rematch` },
    );

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
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, "__abortJsonRead") === true), {
        message: "the page never read the abort response body",
      })
      .toBe(true);

    expect(await page.evaluate(() => Reflect.get(window, "__rematchFetches"))).toBe(0);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page).toHaveURL(/\/start\/abc$/);
  });
});
