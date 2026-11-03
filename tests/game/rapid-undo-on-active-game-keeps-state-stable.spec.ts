// seed: tests/seed.spec.ts

import { expect, test, type Locator, type Page } from "../shared/test";
import { installGameRoutes } from "../shared/game-routes";

type PlayerThrow = {
  value: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
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
  isGuest: boolean;
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
  isGuest: false,
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

    // Each Undo tap steps back one throw (ADR 0003), so a double tap removes 20 and 19.
    const stateAfterSecondUndo: MockGameState = {
      ...stateAfterUndo,
      currentThrowCount: 0,
      players: stateAfterUndo.players.map((player) =>
        player.id === 1
          ? { ...player, score: 301, throwsInCurrentRound: 0, currentRoundThrows: [] }
          : player,
      ),
    };

    const stateAfterThrowFollowingUndo: MockGameState = {
      ...stateAfterSecondUndo,
      currentThrowCount: 1,
      players: stateAfterSecondUndo.players.map((player) =>
        player.id === 1
          ? {
              ...player,
              score: 296,
              throwsInCurrentRound: 1,
              currentRoundThrows: [{ value: 5, isDouble: false, isTriple: false, isBust: false }],
            }
          : player,
      ),
    };

    let undoRequestCount = 0;

    await mockAuth(page);
    await installGameRoutes(page, {
      initialState: createState(),
      throwStates: [stateAfterThrowFollowingUndo],
      undoStates: [stateAfterUndo, stateAfterSecondUndo],
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

    // 4. Verify each tap undid one throw and no other player's score changed.
    await expect(playerCard(page, "Hugh")).toContainText("301");
    await expect(playerCard(page, "Alica")).toContainText("226");
    await expect(playerCard(page, "Test")).toContainText("180");
    await expect.poll(() => undoRequestCount).toBe(2);

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
    await expect(playerCard(page, "Hugh")).toContainText("296");
    await expect(playerCard(page, "Hugh")).toContainText("5");
    await expect(playerCard(page, "Hugh")).toHaveAttribute("aria-current", "true");
  });
});
