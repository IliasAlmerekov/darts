import { test, expect, type Locator, type Page } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockGameState } from "../shared/game-route-mocks";
import { fulfillJson } from "../shared/json-response";
import { navigateInApp } from "../shared/in-app-navigation";
import { mockFinishedGame } from "../shared/summary-mocks";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

// Throw sync rules from ADR 0003.

interface PlayerScore {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
}

const ALICE = { id: 1, name: "Alice" };
const BOB = { id: 2, name: "Bob" };

function gameState(gameId: number, scores: PlayerScore[]) {
  const activePlayer = scores.find((player) => player.isActive) ?? null;

  return {
    id: gameId,
    status: "started",
    currentRound: 1,
    activePlayerId: activePlayer?.id ?? null,
    currentThrowCount: 0,
    winnerId: null,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: scores.map((player) => ({
      ...player,
      isBust: false,
      isGuest: false,
      position: player.score === 0 ? 1 : null,
      throwsInCurrentRound: 0,
      currentRoundThrows: [],
      roundHistory: [],
    })),
  };
}

/**
 * The backend's ack for a throw. A throw that leaves at most one active player finishes the
 * game in the same request: the ack says `finished` and every player has a position.
 */
function throwAck(gameId: number, scores: PlayerScore[]) {
  const winner = scores.find((player) => player.score === 0) ?? null;
  const isFinished = scores.filter((player) => player.score > 0).length <= 1;
  const finishingOrder = [
    ...scores.filter((player) => player.score === 0),
    ...scores.filter((player) => player.score > 0),
  ];
  const positionOf = (player: PlayerScore): number | null => {
    if (isFinished) {
      return finishingOrder.indexOf(player) + 1;
    }
    return player.score === 0 ? 1 : null;
  };

  return {
    success: true,
    gameId,
    stateVersion: `v-${scores.map((player) => player.score).join("-")}`,
    throw: null,
    scoreboardDelta: {
      changedPlayers: scores.map((player) => ({
        playerId: player.id,
        name: player.name,
        score: player.score,
        position: positionOf(player),
        isActive: player.isActive,
        isGuest: false,
        isBust: false,
      })),
      winnerId: winner?.id ?? null,
      status: isFinished ? "finished" : "started",
      currentRound: 1,
    },
    serverTs: "2026-10-23T10:00:00Z",
  };
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
  // #96: the server finishes the game with the winning throw; the client sends no /finish.
  test("winning throw ack opens the summary", async ({ page }) => {
    const gameId = 1;
    await mockAdminSession(page);
    const answerTabletGame = await mockTabletGame(page, startedTabletGame(gameId));
    await mockGameState(page, gameId, gameState(gameId, playerScores(20, 301)));
    await mockGameSettings(page, gameId);
    await mockFinishedGame(page, gameId);
    await page.route(`**/api/game/${gameId}/throw/delta`, async (route) => {
      answerTabletGame({ game: null, lastFinishedGameId: gameId });
      await fulfillJson(route, throwAck(gameId, playerScores(0, 301, "Bob")));
    });
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

  // #95
  test("ignores a throw response of the previous game after the next game opens", async ({
    page,
  }) => {
    await mockAdminSession(page);
    const answerTabletGame = await mockTabletGame(page, startedTabletGame(1));
    await mockGameState(page, 1, gameState(1, playerScores(301, 301)));
    await mockGameState(page, 2, gameState(2, playerScores(301, 301)));
    let releaseThrow!: () => void;
    const throwReleased = new Promise<void>((resolve) => {
      releaseThrow = resolve;
    });
    await page.route("**/api/game/1/throw/delta", async (route) => {
      await throwReleased;
      await fulfillJson(route, throwAck(1, playerScores(281, 301)));
    });

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
    await mockGameState(page, gameId, gameState(gameId, playerScores(301, 301)));
    await page.route(`**/api/game/${gameId}/throw/delta`, async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

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
    await mockGameState(page, gameId, gameState(gameId, playerScores(301, 301)));
    await page.route(`**/api/game/${gameId}/throw/delta`, async (route) => {
      const ack = acks.shift() ?? playerScores(241, 301, "Bob");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await fulfillJson(route, throwAck(gameId, ack));
    });
    await page.route(`**/api/game/${gameId}/throw`, async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await fulfillJson(route, gameState(gameId, playerScores(261, 301)));
    });

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
