// spec: specs/ticket-test-plan.md
// seed: tests/shared/seed.spec.ts

import { test, expect, type Locator, type Page, type Route, type Request } from "@playwright/test";

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

type ThrowRequestPayload = {
  playerId: number;
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
};

type RouteOptions = {
  gameId?: number;
  initialState: MockGameState;
  throwStates?: MockGameState[];
  undoStates?: MockGameState[];
  undoResponseDelayMs?: number;
  conflictOnThrow?: boolean;
  conflictRefetchState?: MockGameState;
  onUndoRequest?: (request: Request) => void;
  onSettingsRequest?: (payload: { doubleOut?: boolean; tripleOut?: boolean }) => void;
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
  currentRound: 1,
  activePlayerId: 1,
  currentThrowCount: 0,
  players: [createPlayer(1, "Player 1", 301, true), createPlayer(2, "Player 2", 301, false)],
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

const backToHomeButton = (page: Page): Locator =>
  page.getByRole("button", { name: "Back to Home" });

const settingsButton = (page: Page): Locator => page.getByRole("button", { name: "Settings" });

const undoButton = (page: Page): Locator => page.getByRole("button", { name: "Undo" });

const playerCard = (page: Page, name: string): Locator => page.getByRole("group", { name });

const bustIcons = (scope: Page | Locator): Locator => scope.getByRole("img", { name: "Bust icon" });

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

const jsonFromRequest = <T>(request: Request): T => {
  const parsed = request.postDataJSON();
  return parsed as T;
};

const installGameRoutes = async (page: Page, options: RouteOptions): Promise<void> => {
  const gameId = options.gameId ?? 1;
  let currentState: MockGameState = options.initialState;
  const throwStates = [...(options.throwStates ?? [])];
  const undoStates = [...(options.undoStates ?? [])];
  let throwSequence = 0;
  let getCount = 0;

  await page.route(`**/api/game/${gameId}*`, async (route: Route, request: Request) => {
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }

    getCount += 1;

    if (options.conflictOnThrow && options.conflictRefetchState && getCount >= 2) {
      currentState = options.conflictRefetchState;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-Game-State-Version": `v${getCount}`,
      },
      body: JSON.stringify(currentState),
    });
  });

  await page.route(`**/api/game/${gameId}/throw/delta`, async (route: Route) => {
    if (options.conflictOnThrow && throwSequence === 0) {
      throwSequence += 1;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "GAME_THROW_NOT_ALLOWED" }),
      });
      return;
    }

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

  await page.route(`**/api/game/${gameId}/settings`, async (route: Route, request: Request) => {
    if (request.method() !== "PATCH") {
      await route.fallback();
      return;
    }

    const payload = jsonFromRequest<{ doubleOut?: boolean; tripleOut?: boolean }>(request);
    options.onSettingsRequest?.(payload);

    currentState = {
      ...currentState,
      settings: {
        ...currentState.settings,
        doubleOut: !!payload.doubleOut,
        tripleOut: !!payload.tripleOut,
      },
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentState),
    });
  });
};

const openGame = async (page: Page, gameId = 1): Promise<void> => {
  await page.goto(`/game/${gameId}`);
  await expect(backToHomeButton(page)).toBeVisible();
  await expect(settingsButton(page)).toBeVisible();
};

test.describe("Basic Throw Mechanics and Validation", () => {
  test("1.1 Record a single standard throw and update active player state", async ({ page }) => {
    const stateAfterThrow = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterThrow],
    });

    await openGame(page);
    await expect(page.getByRole("button", { name: "20", exact: true })).toBeVisible();
    await expect(undoButton(page)).toBeDisabled();
    await expect(playerCard(page, "Player 1")).toHaveAttribute("aria-current", "true");

    const throwRequestPromise = page.waitForRequest("**/api/game/1/throw/delta");
    await page.getByRole("button", { name: "20", exact: true }).click();
    const throwRequest = await throwRequestPromise;

    const payload = throwRequest.postDataJSON() as ThrowRequestPayload;
    expect(payload.value).toBe(20);
    expect(payload.isDouble).toBe(false);
    expect(payload.isTriple).toBe(false);

    const p1 = playerCard(page, "Player 1");
    await expect(p1).toContainText("281");
    await expect(p1).toContainText("20");
    await expect(undoButton(page)).toBeEnabled();
  });

  test("1.2 Apply Double and Triple modifiers as one-shot throw multipliers", async ({ page }) => {
    const stateAfterDouble = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 261, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: true, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    const stateAfterTriple = createState({
      currentThrowCount: 2,
      players: [
        createPlayer(1, "Player 1", 204, true, {
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: true, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: true, isBust: false },
          ],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterDouble, stateAfterTriple],
    });

    await openGame(page);

    const doubleButton = page.getByRole("button", { name: "Double" });
    await doubleButton.click();
    await expect(doubleButton).toHaveAttribute("aria-pressed", "true");

    const doubleThrowRequestPromise = page.waitForRequest("**/api/game/1/throw/delta");
    await page.getByRole("button", { name: "20", exact: true }).click();
    const doubleThrowRequest = await doubleThrowRequestPromise;
    const doublePayload = doubleThrowRequest.postDataJSON() as ThrowRequestPayload;

    expect(doublePayload).toMatchObject({ value: 20, isDouble: true, isTriple: false });
    await expect(playerCard(page, "Player 1")).toContainText("261");
    await expect(doubleButton).toHaveAttribute("aria-pressed", "false");

    const tripleButton = page.getByRole("button", { name: "Triple" });
    await tripleButton.click();

    await expect(page.getByRole("button", { name: "25", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "0", exact: true })).toBeDisabled();

    const tripleThrowRequestPromise = page.waitForRequest("**/api/game/1/throw/delta");
    await page.getByRole("button", { name: "19", exact: true }).click();
    const tripleThrowRequest = await tripleThrowRequestPromise;
    const triplePayload = tripleThrowRequest.postDataJSON() as ThrowRequestPayload;

    expect(triplePayload).toMatchObject({ value: 19, isDouble: false, isTriple: true });
    await expect(playerCard(page, "Player 1")).toContainText("204");
    await expect(tripleButton).toHaveAttribute("aria-pressed", "false");
  });

  test("1.3 Complete three throws and switch turn to next active player", async ({ page }) => {
    const stateAfterThrow1 = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    const stateAfterThrow2 = createState({
      currentThrowCount: 2,
      players: [
        createPlayer(1, "Player 1", 262, true, {
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: false, isBust: false },
          ],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    const stateAfterThrow3 = createState({
      activePlayerId: 2,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 244, false, {
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [
            {
              round: 1,
              throws: [
                { value: 20, isDouble: false, isTriple: false, isBust: false },
                { value: 19, isDouble: false, isTriple: false, isBust: false },
                { value: 18, isDouble: false, isTriple: false, isBust: false },
              ],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterThrow1, stateAfterThrow2, stateAfterThrow3],
    });

    await openGame(page);

    await page.getByRole("button", { name: "20", exact: true }).click();
    await expect(playerCard(page, "Player 1")).toContainText("20");

    await page.getByRole("button", { name: "19", exact: true }).click();
    await expect(playerCard(page, "Player 1")).toContainText("19");

    await page.getByRole("button", { name: "18", exact: true }).click();

    await expect(playerCard(page, "Player 2")).toHaveAttribute("aria-current", "true");
    await expect(playerCard(page, "Player 2")).toContainText("301");

    const p1 = playerCard(page, "Player 1");
    await expect(p1).toContainText("244");
  });

  test("1.4 Handle bust when throw would produce invalid remaining score", async ({ page }) => {
    const stateAfterBust = createState({
      activePlayerId: 2,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 10, false, {
          isBust: true,
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: true }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState({
        players: [createPlayer(1, "Player 1", 10, true), createPlayer(2, "Player 2", 301, false)],
      }),
      throwStates: [stateAfterBust],
    });

    await openGame(page);
    await expect(playerCard(page, "Player 1")).toHaveAttribute("aria-current", "true");
    await expect(bustIcons(page)).toHaveCount(0);

    await page.getByRole("button", { name: "20", exact: true }).click();

    const p1 = playerCard(page, "Player 1");
    await expect(p1).toContainText("10");
    await expect(bustIcons(p1)).not.toHaveCount(0);
    await expect(playerCard(page, "Player 2")).toHaveAttribute("aria-current", "true");
  });

  test("1.5 Enforce checkout rules from Settings (Double-out and Triple-out)", async ({ page }) => {
    const settingsRequests: Array<{ doubleOut?: boolean; tripleOut?: boolean }> = [];

    const stateAfterInvalidSingleCheckout = createState({
      currentThrowCount: 0,
      activePlayerId: 2,
      players: [
        createPlayer(1, "Player 1", 20, false, {
          isBust: true,
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: true }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
      ],
      settings: {
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      },
    });

    const stateAfterValidDoubleCheckout = createState({
      currentThrowCount: 0,
      activePlayerId: 2,
      winnerId: 1,
      players: [
        createPlayer(1, "Player 1", 0, false, {
          position: 1,
          isBust: false,
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 10, isDouble: true, isTriple: false, isBust: false }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
      ],
      settings: {
        startScore: 301,
        doubleOut: true,
        tripleOut: false,
      },
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState({
        players: [createPlayer(1, "Player 1", 20, true), createPlayer(2, "Player 2", 301, false)],
      }),
      throwStates: [stateAfterInvalidSingleCheckout, stateAfterValidDoubleCheckout],
      onSettingsRequest: (payload) => settingsRequests.push(payload),
    });

    await openGame(page);

    await settingsButton(page).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Double-out" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
    expect(settingsRequests[0]).toEqual({ doubleOut: true, tripleOut: false });

    await page.getByRole("button", { name: "20", exact: true }).click();
    const p1AfterBust = playerCard(page, "Player 1");
    await expect(p1AfterBust).toContainText("20");
    await expect(bustIcons(p1AfterBust)).not.toHaveCount(0);

    await page.getByRole("button", { name: "Double" }).click();
    const winningThrowRequestPromise = page.waitForRequest("**/api/game/1/throw/delta");
    await page.getByRole("button", { name: "10", exact: true }).click();
    const winningThrowRequest = await winningThrowRequestPromise;
    const winningPayload = winningThrowRequest.postDataJSON() as ThrowRequestPayload;
    expect(winningPayload).toMatchObject({ value: 10, isDouble: true, isTriple: false });
  });

  test("1.6 Undo last throw within current turn", async ({ page }) => {
    const stateAfterFirstThrow = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    const stateAfterSecondThrow = createState({
      currentThrowCount: 2,
      players: [
        createPlayer(1, "Player 1", 262, true, {
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: false, isBust: false },
          ],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    const stateAfterUndo = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterFirstThrow, stateAfterSecondThrow],
      undoStates: [stateAfterUndo],
    });

    await openGame(page);

    await page.getByRole("button", { name: "20", exact: true }).click();
    await page.getByRole("button", { name: "19", exact: true }).click();

    const p1BeforeUndo = playerCard(page, "Player 1");
    await expect(undoButton(page)).toBeEnabled();
    await expect(p1BeforeUndo).toContainText("20");
    await expect(p1BeforeUndo).toContainText("19");

    const undoRequestPromise = page.waitForRequest((request) => {
      return request.url().includes("/api/game/1/throw") && request.method() === "DELETE";
    });
    await undoButton(page).click();
    await undoRequestPromise;

    const p1AfterUndo = playerCard(page, "Player 1");
    await expect(p1AfterUndo).toContainText("281");
    await expect(playerCard(page, "Player 1")).toHaveAttribute("aria-current", "true");
  });

  test("1.7 Undo from finish overlay after a winning throw", async ({ page }) => {
    const stateAfterWinningThrow = createState({
      activePlayerId: 2,
      winnerId: 1,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 0, false, {
          position: 1,
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
        createPlayer(3, "Player 3", 301, false),
      ],
    });

    const stateAfterUndo = createState({
      winnerId: null,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 20, true),
        createPlayer(2, "Player 2", 301, false),
        createPlayer(3, "Player 3", 301, false),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState({
        players: [
          createPlayer(1, "Player 1", 20, true),
          createPlayer(2, "Player 2", 301, false),
          createPlayer(3, "Player 3", 301, false),
        ],
      }),
      throwStates: [stateAfterWinningThrow],
      undoStates: [stateAfterUndo],
    });

    await openGame(page);

    await page.getByRole("button", { name: "20", exact: true }).click();

    await expect(page.getByRole("list", { name: "Finished players list" })).toContainText(
      "Player 1",
    );
    await expect(page.getByText("Player Finished! Continue Game?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo Throw" })).toBeVisible();

    const number20 = page.getByRole("button", { name: "20", exact: true });
    await expect(number20).toBeDisabled();

    await page.getByRole("button", { name: "Undo Throw" }).click();

    await expect(playerCard(page, "Player 1")).toContainText("20");
    await expect(page.getByText("Player Finished! Continue Game?")).toHaveCount(0);
    await expect(number20).toBeEnabled();
  });

  test("1.7b Rapid undo from finish overlay keeps state stable for the next throw", async ({
    page,
  }) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      consoleMessages.push(message.text());
    });

    const stateAfterWinningThrow = createState({
      activePlayerId: 2,
      winnerId: 1,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 0, false, {
          position: 1,
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
        createPlayer(3, "Player 3", 301, false),
      ],
    });

    const stateAfterUndo = createState({
      winnerId: null,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 20, true),
        createPlayer(2, "Player 2", 301, false),
        createPlayer(3, "Player 3", 301, false),
      ],
    });

    const stateAfterThrowFollowingUndo = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 15, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 5, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
        createPlayer(3, "Player 3", 301, false),
      ],
    });

    let undoRequestCount = 0;

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState({
        players: [
          createPlayer(1, "Player 1", 20, true),
          createPlayer(2, "Player 2", 301, false),
          createPlayer(3, "Player 3", 301, false),
        ],
      }),
      throwStates: [stateAfterWinningThrow, stateAfterThrowFollowingUndo],
      undoStates: [stateAfterUndo],
      undoResponseDelayMs: 150,
      onUndoRequest: () => {
        undoRequestCount += 1;
      },
    });

    await openGame(page);

    await page.getByRole("button", { name: "20", exact: true }).click();
    await expect(page.getByText("Player Finished! Continue Game?")).toBeVisible();

    await page.getByRole("button", { name: "Undo Throw" }).dblclick();

    await expect(page.getByText("Player Finished! Continue Game?")).toHaveCount(0);
    expect(undoRequestCount).toBe(1);

    const numberFive = page.getByRole("button", { name: "5", exact: true });
    await expect(numberFive).toBeEnabled();
    await numberFive.click();

    await expect(playerCard(page, "Player 1")).toContainText("15");

    const relevantConsoleMessages = consoleMessages.filter((message) => {
      return (
        message.includes("Maximum update depth exceeded") ||
        message.includes("Cannot throw: no active player found")
      );
    });

    expect(relevantConsoleMessages).toEqual([]);
  });

  test("1.8 Recover from throw conflict by syncing latest server state", async ({ page }) => {
    const serverAuthoritativeState = createState({
      activePlayerId: 2,
      currentRound: 2,
      currentThrowCount: 0,
      players: [
        createPlayer(1, "Player 1", 281, false, {
          roundHistory: [
            {
              round: 1,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            },
          ],
        }),
        createPlayer(2, "Player 2", 301, true),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      conflictOnThrow: true,
      conflictRefetchState: serverAuthoritativeState,
    });

    await openGame(page);

    await page.getByRole("button", { name: "20", exact: true }).click();

    await expect(playerCard(page, "Player 2")).toHaveAttribute("aria-current", "true");
    await expect(playerCard(page, "Player 1")).toContainText("281");

    const optionalSyncMessage = page.getByText(
      "Game state changed in another session. Synced latest game state.",
    );
    if (await optionalSyncMessage.count()) {
      await expect(optionalSyncMessage.first()).toBeVisible();
    }
  });

  test("1.9 Keyboard accessibility for throw input controls", async ({ page }) => {
    const stateAfterKeyboardThrow = createState({
      currentThrowCount: 1,
      players: [
        createPlayer(1, "Player 1", 281, true, {
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        }),
        createPlayer(2, "Player 2", 301, false),
      ],
    });

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterKeyboardThrow],
    });

    await openGame(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Back to Home" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();

    const triple = page.getByRole("button", { name: "Triple" });
    await triple.focus();
    await expect(triple).toBeFocused();
    await expect(triple).not.toHaveCSS("outline-style", "none");
    await page.keyboard.press("Enter");

    const twentyFive = page.getByRole("button", { name: "25", exact: true });
    const zero = page.getByRole("button", { name: "0", exact: true });
    await expect(twentyFive).toBeDisabled();
    await expect(zero).toBeDisabled();

    await expect(undoButton(page)).toBeDisabled();

    const twenty = page.getByRole("button", { name: "20", exact: true });
    const keyboardThrowRequestPromise = page.waitForRequest("**/api/game/1/throw/delta");
    await twenty.focus();
    await page.keyboard.press("Space");
    const keyboardThrowRequest = await keyboardThrowRequestPromise;
    const keyboardPayload = keyboardThrowRequest.postDataJSON() as ThrowRequestPayload;

    expect(keyboardPayload).toMatchObject({ value: 20, isDouble: false });
    await expect(playerCard(page, "Player 1")).toContainText("281");
  });
});
