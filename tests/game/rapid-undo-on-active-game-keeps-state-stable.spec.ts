// seed: tests/seed.spec.ts

import { expect, test, type Locator, type Page, type Request, type Route } from "@playwright/test";

type PlayerThrow = {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
};

type RoundHistory = {
  round?: number;
  throws: PlayerThrow[];
};

type MockPlayer = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number | null;
  throwsInCurrentRound: number;
  currentRoundThrows: PlayerThrow[];
  roundHistory: RoundHistory[];
};

type MockGameState = {
  id: number;
  status: "started" | "finished" | "lobby";
  currentRound: number;
  activePlayerId: number;
  currentThrowCount: number;
  players: MockPlayer[];
  winnerId: number | null;
  settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  };
};

type RouteOptions = {
  gameId?: number;
  initialState: MockGameState;
  throwStates?: MockGameState[];
  undoStates?: MockGameState[];
  undoResponseDelayMs?: number;
  onUndoRequest?: (request: Request) => void;
};

const createPlayer = (
  id: number,
  name: string,
  score: number,
  isActive: boolean,
  overrides: Partial<MockPlayer> = {},
): MockPlayer => ({
  id,
  name,
  score,
  isActive,
  isBust: false,
  position: null,
  throwsInCurrentRound: 0,
  currentRoundThrows: [],
  roundHistory: [],
  ...overrides,
});

const createState = (overrides: Partial<MockGameState> = {}): MockGameState => ({
  id: 1,
  status: "started",
  currentRound: 5,
  activePlayerId: 1,
  currentThrowCount: 2,
  players: [
    createPlayer(1, "Hugh", 262, true, {
      throwsInCurrentRound: 2,
      currentRoundThrows: [
        { value: 20, isDouble: false, isTriple: false, isBust: false },
        { value: 19, isDouble: false, isTriple: false, isBust: false },
      ],
      roundHistory: [
        {
          round: 4,
          throws: [
            { value: 18, isDouble: false, isTriple: false, isBust: false },
            { value: 18, isDouble: false, isTriple: false, isBust: false },
            { value: 18, isDouble: false, isTriple: false, isBust: false },
          ],
        },
      ],
    }),
    createPlayer(2, "Alica", 226, false, {
      roundHistory: [
        {
          round: 4,
          throws: [
            { value: 25, isDouble: false, isTriple: false, isBust: false },
            { value: 25, isDouble: false, isTriple: false, isBust: false },
            { value: 25, isDouble: false, isTriple: false, isBust: false },
          ],
        },
      ],
    }),
    createPlayer(3, "Test", 180, false, {
      roundHistory: [
        {
          round: 4,
          throws: [
            { value: 17, isDouble: false, isTriple: false, isBust: false },
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: false, isBust: false },
          ],
        },
      ],
    }),
  ],
  winnerId: null,
  settings: {
    startScore: 301,
    doubleOut: false,
    tripleOut: false,
  },
  ...overrides,
});

const createScoreboardDelta = (state: MockGameState) => ({
  changedPlayers: state.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    score: player.score,
    position: player.position,
    isActive: player.isActive,
    isGuest: false,
    isBust: player.isBust,
  })),
  winnerId: state.winnerId,
  status: state.status,
  currentRound: state.currentRound,
});

const playerCard = (page: Page, name: string): Locator => page.getByRole("group", { name });

const undoButton = (page: Page): Locator => page.getByRole("button", { name: "Undo" });

const mockAuth = async (page: Page): Promise<void> => {
  await page.route("**/api/login/success", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        roles: ["ROLE_ADMIN", "ROLE_PLAYER"],
        id: 1,
        username: "testuser",
        redirect: "/start",
      }),
    });
  });
};

const installGameRoutes = async (page: Page, options: RouteOptions): Promise<void> => {
  const gameId = options.gameId ?? 1;
  let currentState: MockGameState = options.initialState;
  const throwStates = [...(options.throwStates ?? [])];
  const undoStates = [...(options.undoStates ?? [])];
  let throwSequence = 0;

  await page.route(`**/api/game/${gameId}*`, async (route: Route, request: Request) => {
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-Game-State-Version": `v${throwSequence + 1}`,
      },
      body: JSON.stringify(currentState),
    });
  });

  await page.route(`**/api/game/${gameId}/throw/delta`, async (route: Route) => {
    const nextState = throwStates.shift();
    if (nextState) {
      currentState = nextState;
    }

    throwSequence += 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        gameId,
        stateVersion: `throw-v${throwSequence}`,
        throw: null,
        scoreboardDelta: createScoreboardDelta(currentState),
        serverTs: new Date().toISOString(),
      }),
    });
  });

  await page.route(`**/api/game/${gameId}/throw`, async (route: Route, request: Request) => {
    if (request.method() !== "DELETE") {
      await route.fallback();
      return;
    }

    options.onUndoRequest?.(request);
    const nextState = undoStates.shift();
    if (nextState) {
      currentState = nextState;
    }

    if (options.undoResponseDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.undoResponseDelayMs));
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentState),
    });
  });
};

const openGame = async (page: Page, gameId = 1): Promise<void> => {
  await page.goto(`/game/${gameId}`);
  await expect(page.getByRole("button", { name: "Back to Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
};

test.describe("Undo Race Condition on Game Page", () => {
  test("Rapid Undo on active game should not corrupt state", async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      consoleMessages.push(message.text());
    });

    const stateAfterUndo = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Hugh", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 18, isDouble: false, isTriple: false, isBust: false },
                { value: 18, isDouble: false, isTriple: false, isBust: false },
                { value: 18, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
        createPlayer(2, "Alica", 226, false, {
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 25, isDouble: false, isTriple: false, isBust: false },
                { value: 25, isDouble: false, isTriple: false, isBust: false },
                { value: 25, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
        createPlayer(3, "Test", 180, false, {
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 17, isDouble: false, isTriple: false, isBust: false },
                { value: 20, isDouble: false, isTriple: false, isBust: false },
                { value: 19, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
      ],
    });

    const stateAfterThrowFollowingUndo = createState({
      currentThrowCount: 2,
      players: [
        createPlayer(1, "Hugh", 276, true, {
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 5, isDouble: false, isTriple: false, isBust: false },
          ],
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 18, isDouble: false, isTriple: false, isBust: false },
                { value: 18, isDouble: false, isTriple: false, isBust: false },
                { value: 18, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
        createPlayer(2, "Alica", 226, false, {
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 25, isDouble: false, isTriple: false, isBust: false },
                { value: 25, isDouble: false, isTriple: false, isBust: false },
                { value: 25, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
        createPlayer(3, "Test", 180, false, {
          roundHistory: [
            {
              round: 4,
              throws: [
                { value: 17, isDouble: false, isTriple: false, isBust: false },
                { value: 20, isDouble: false, isTriple: false, isBust: false },
                { value: 19, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
      ],
    });

    let undoRequestCount = 0;

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterThrowFollowingUndo],
      undoStates: [stateAfterUndo],
      undoResponseDelayMs: 150,
      onUndoRequest: () => {
        undoRequestCount += 1;
      },
    });

    // 1. Open the game page with an in-progress started game.
    await openGame(page);

    // 2. Ensure multiple players are visible and Undo is enabled.
    await expect(playerCard(page, "Hugh")).toContainText("262");
    await expect(playerCard(page, "Alica")).toContainText("226");
    await expect(playerCard(page, "Test")).toContainText("180");
    await expect(undoButton(page)).toBeEnabled();

    // 3. Rapidly trigger the Undo action multiple times on the main game page.
    await undoButton(page).dblclick();

    // 4. Verify the UI does not show corrupted repeated throws for every player.
    await expect(playerCard(page, "Hugh")).toContainText("281");
    await expect(playerCard(page, "Hugh")).toContainText("20");
    await expect(playerCard(page, "Alica")).toContainText("226");
    await expect(playerCard(page, "Test")).toContainText("180");
    expect(undoRequestCount).toBe(1);

    // 5. Perform a new throw immediately after the rapid Undo sequence.
    await page.getByRole("button", { name: "5", exact: true }).click();

    // 6. Verify no `Maximum update depth exceeded` or `Cannot throw: no active player found` error is produced.
    const relevantConsoleMessages = consoleMessages.filter((message) => {
      return (
        message.includes("Maximum update depth exceeded") ||
        message.includes("Cannot throw: no active player found")
      );
    });
    expect(relevantConsoleMessages).toEqual([]);

    // 7. Verify the next throw is accepted and the active player remains valid.
    await expect(playerCard(page, "Hugh")).toContainText("276");
    await expect(playerCard(page, "Hugh")).toContainText("5");
    await expect(playerCard(page, "Hugh")).toHaveAttribute("aria-current", "true");
  });
});
