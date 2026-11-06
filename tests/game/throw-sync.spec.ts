import { test, expect, type Locator, type Page } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { fulfillJson } from "../shared/json-response";
import { navigateInApp } from "../shared/in-app-navigation";
import { mockFinishedGame } from "../shared/summary-mocks";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

import { installScriptedTransportRoutes } from "../shared/game-routes";
import { createScriptedGameBackend } from "../../src/shared/types/gameSession.test-support";
import type { GameThrowsResponse } from "../../src/shared/api/game";

// Throw sync rules from ADR 0003.

interface PlayerScore {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
}

const ALICE = { id: 1, name: "Alice" };
const BOB = { id: 2, name: "Bob" };
const CARA = { id: 3, name: "Cara" };

function gameState(gameId: number, scores: PlayerScore[]): GameThrowsResponse {
  const activePlayer = scores.find((player) => player.isActive) ?? null;

  return {
    type: "full-state",
    id: gameId,
    status: "started",
    currentRound: 1,
    activePlayerId: activePlayer?.id ?? null,
    currentThrowCount: 0,
    winnerId: null,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: scores.map((player, index) => ({
      ...player,
      isBust: false,
      isGuest: false,
      position: index,
      placement: player.score === 0 ? 1 : null,
      throwsInCurrentRound: 0,
      currentRoundThrows: [],
      roundHistory: [],
    })),
  };
}

function serverState(gameId: number, scores: PlayerScore[], finished = false): GameThrowsResponse {
  const state = gameState(gameId, scores);
  return {
    ...state,
    status: finished ? "finished" : "started",
    winnerId: scores[0]?.score === 0 ? 1 : null,
    players: state.players.map((player, index) => ({
      ...player,
      placement: finished ? index + 1 : player.placement,
    })),
  };
}

async function installScript(
  page: Page,
  gameId: number,
  initial: GameThrowsResponse,
  onThrow?: () => void,
) {
  const backend = createScriptedGameBackend();
  backend.loads.push(initial);
  await installScriptedTransportRoutes(page, gameId, backend, onThrow);
  return backend;
}

const playerScores = (
  alice: number,
  bob: number,
  active: "Alice" | "Bob" = "Alice",
): PlayerScore[] => [
  { ...ALICE, score: alice, isActive: active === "Alice" },
  { ...BOB, score: bob, isActive: active === "Bob" },
];

async function mockGameSettings(page: Page, gameId: number): Promise<void> {
  await page.route(`**/api/game/${gameId}/settings`, async (route) => {
    await fulfillJson(route, {
      gameId,
      status: "finished",
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
  });
}

const playerCard = (page: Page, name: string): Locator => page.getByRole("group", { name });

const tap = async (page: Page, name: string): Promise<void> => {
  await page.getByRole("button", { name, exact: true }).click();
};

test.describe("Throw sync on the game page", () => {
  test("shows a checkout suggestion on the active card", async ({ page }) => {
    await mockAdminSession(page);
    await mockTabletGame(page, startedTabletGame(1));
    await installScript(page, 1, gameState(1, playerScores(20, 301)));
    await page.goto("/game/1");
    await expect(playerCard(page, "Alice")).toContainText("Checkout: 20");
  });

  // #96: the server finishes the game with the winning throw; the client sends no /finish.
  test("winning throw ack opens the summary", async ({ page }) => {
    const gameId = 1;
    await mockAdminSession(page);
    const answerTabletGame = await mockTabletGame(page, startedTabletGame(gameId));
    const backend = await installScript(
      page,
      gameId,
      gameState(gameId, playerScores(20, 301)),
      () => answerTabletGame({ game: null, lastFinishedGameId: gameId }),
    );
    backend.throws.push(serverState(gameId, playerScores(0, 301, "Bob"), true));
    await mockGameSettings(page, gameId);
    await mockFinishedGame(page, gameId);
    const finishRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/game/${gameId}/finish`)) {
        finishRequests.push(request.url());
      }
    });

    await page.goto(`/game/${gameId}`);
    await expect(playerCard(page, "Alice")).toContainText("20");
    await tap(page, "20");

    await expect(page).toHaveURL(`/summary/${gameId}`);
    await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();
    expect(finishRequests).toEqual([]);
  });

  // #395: the first checkout's overlay ends the game on the server.
  test.describe("Finish game in the finish overlay", () => {
    const gameId = 1;
    const threePlayers = (alice: number, active: "Alice" | "Bob"): PlayerScore[] => [
      ...playerScores(alice, 301, active),
      { ...CARA, score: 301, isActive: false },
    ];
    const finishOverlay = (page: Page): Locator =>
      page.getByRole("dialog", { name: "Player Finished!" });

    let backend: ReturnType<typeof createScriptedGameBackend>;
    test.beforeEach(async ({ page }) => {
      await mockAdminSession(page);
      backend = await installScript(page, gameId, gameState(gameId, threePlayers(20, "Alice")));
      await mockGameSettings(page, gameId);
    });

    test("waits for the checkout ack, then opens the summary with the winner first", async ({
      page,
    }) => {
      const answerTabletGame = await mockTabletGame(page, startedTabletGame(gameId));
      let releaseThrow!: () => void;
      const throwReleased = new Promise<void>((resolve) => {
        releaseThrow = resolve;
      });
      backend.throws.push(throwReleased.then(() => serverState(gameId, threePlayers(0, "Bob"))));
      backend.finishes.push([
        {
          playerId: 1,
          username: "Alice",
          position: 0,
          placement: 1,
          roundsPlayed: 5,
          roundAverage: 60.2,
        },
        {
          playerId: 2,
          username: "Bob",
          position: 1,
          placement: 2,
          roundsPlayed: 5,
          roundAverage: 60.2,
        },
        {
          playerId: 3,
          username: "Cara",
          position: 2,
          placement: 3,
          roundsPlayed: 5,
          roundAverage: 60.2,
        },
      ]);

      await page.goto(`/game/${gameId}`);
      await expect(playerCard(page, "Alice")).toContainText("20");
      await tap(page, "20");

      const finishButton = finishOverlay(page).getByRole("button", { name: "Finish game" });
      await expect(finishButton).toBeDisabled();
      answerTabletGame({ game: null, lastFinishedGameId: gameId });
      releaseThrow();
      await expect(finishButton).toBeEnabled();
      await finishButton.click();

      await expect(page).toHaveURL(`/summary/${gameId}`);
      await expect(page.getByRole("heading", { name: /^(Alice|Bob|Cara)$/ })).toHaveText([
        "Alice",
        "Bob",
        "Cara",
      ]);
      expect(backend.requests.filter((request) => request.kind === "finish")).toHaveLength(1);
    });

    test("a failed finish shows an error and Continue keeps the game playable", async ({
      page,
    }) => {
      await mockTabletGame(page, startedTabletGame(gameId));
      backend.throws.push(serverState(gameId, threePlayers(0, "Bob")));
      backend.finishes.push(new Error("Server error"));

      await page.goto(`/game/${gameId}`);
      await expect(playerCard(page, "Alice")).toContainText("20");
      await tap(page, "20");
      await finishOverlay(page).getByRole("button", { name: "Finish game" }).click();

      await expect(finishOverlay(page).getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL(`/game/${gameId}`);
      await finishOverlay(page).getByRole("button", { name: "Continue game" }).click();

      await expect(finishOverlay(page)).toBeHidden();
      await expect(page.getByRole("button", { name: "20", exact: true })).toBeEnabled();
    });
  });

  // #95
  test("ignores a throw response of the previous game after the next game opens", async ({
    page,
  }) => {
    await mockAdminSession(page);
    const answerTabletGame = await mockTabletGame(page, startedTabletGame(1));
    const backend = await installScript(page, 1, gameState(1, playerScores(301, 301)));
    await installScript(page, 2, gameState(2, playerScores(301, 301)));
    let releaseThrow!: () => void;
    const throwReleased = new Promise<void>((resolve) => {
      releaseThrow = resolve;
    });
    backend.throws.push(throwReleased.then(() => serverState(1, playerScores(281, 301))));

    await page.goto("/game/1");
    await tap(page, "20");
    await expect(playerCard(page, "Alice")).toContainText("281");

    // A rematch of the same players started while the throw of game 1 was still pending.
    answerTabletGame(startedTabletGame(2));
    await navigateInApp(page, "/game/2");
    await expect(page).toHaveURL("/game/2");
    await expect(playerCard(page, "Alice")).toContainText("301");

    const lateResponse = page.waitForResponse("**/api/game/1/throw/delta");
    releaseThrow();
    await (await lateResponse).finished();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    await expect(playerCard(page, "Alice")).toContainText("301");
  });

  test("keeps the sync status in the accessibility tree while idle and announces a failure", async ({
    page,
  }) => {
    const gameId = 1;
    await mockAdminSession(page);
    await mockTabletGame(page, startedTabletGame(gameId));
    const initial = gameState(gameId, playerScores(301, 301));
    const backend = await installScript(page, gameId, initial);
    backend.loads.push(initial);
    backend.throws.push(new Error("Server error"));

    await page.goto(`/game/${gameId}`);
    await expect(playerCard(page, "Alice")).toContainText("301");
    // A live region that appears together with its first message is often not announced.
    await expect(page.getByRole("status")).toHaveText("");

    await tap(page, "20");

    await expect(page.getByRole("status")).toContainText("not saved");
  });

  test("changes the scoreboard within 200 ms per tap while the backend takes 1500 ms", async ({
    page,
  }) => {
    const gameId = 1;
    const delayMs = 1500;
    const acks = [playerScores(281, 301), playerScores(261, 301), playerScores(241, 301, "Bob")];
    await mockAdminSession(page);
    await mockTabletGame(page, startedTabletGame(gameId));
    const backend = await installScript(page, gameId, gameState(gameId, playerScores(301, 301)));
    const delayed = (state: GameThrowsResponse): Promise<GameThrowsResponse> =>
      new Promise((resolve) => setTimeout(() => resolve(state), delayMs));
    backend.throws.push(...acks.map((scores) => () => delayed(serverState(gameId, scores))));
    backend.undos.push(() => delayed(serverState(gameId, playerScores(261, 301))));

    await page.goto(`/game/${gameId}`);
    await expect(playerCard(page, "Alice")).toContainText("301");

    for (const expectedScore of ["281", "261", "241"]) {
      await tap(page, "20");
      await expect(playerCard(page, "Alice")).toContainText(expectedScore, { timeout: 200 });
    }

    await tap(page, "Undo");
    await expect(playerCard(page, "Alice")).toContainText("261", { timeout: 200 });
  });
});
