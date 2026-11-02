// #443: on the game page only the player list scrolls, and a turn change leaves the active
// player's card fully visible above the keypad.

import { devices } from "@playwright/test";
import { test, expect, type Page, type Route, type Request } from "../shared/test";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

type PlayerThrow = {
  value: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
};

type MockPlayer = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  isGuest: boolean;
  position: number | null;
  placement: number | null;
  throwsInCurrentRound: number;
  currentRoundThrows: PlayerThrow[];
  roundHistory: { round?: number; throws: PlayerThrow[] }[];
};

type MockGameState = {
  id: number;
  status: "started";
  currentRound: number;
  activePlayerId: number;
  currentThrowCount: number;
  players: MockPlayer[];
  winnerId: null;
  settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
};

const PLAYER_COUNT = 10;

const single = (value: number): PlayerThrow => ({
  value,
  isDouble: false,
  isTriple: false,
  isBust: false,
});

const createPlayer = (
  id: number,
  activePlayerId: number,
  overrides: Partial<MockPlayer> = {},
): MockPlayer => ({
  id,
  name: `Player ${id}`,
  score: 301,
  isActive: id === activePlayerId,
  isBust: false,
  isGuest: false,
  position: id - 1,
  placement: null,
  throwsInCurrentRound: 0,
  currentRoundThrows: [],
  roundHistory: [],
  ...overrides,
});

const createState = (
  activePlayerId: number,
  currentThrowCount: number,
  playerOverrides: Record<number, Partial<MockPlayer>> = {},
): MockGameState => ({
  id: 1,
  status: "started",
  currentRound: 1,
  activePlayerId,
  currentThrowCount,
  players: Array.from({ length: PLAYER_COUNT }, (_, index) =>
    createPlayer(index + 1, activePlayerId, playerOverrides[index + 1]),
  ),
  winnerId: null,
  settings: { startScore: 301, doubleOut: false, tripleOut: false },
});

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

const installGameRoutes = async (
  page: Page,
  initialState: MockGameState,
  stateAfterThrow: MockGameState,
): Promise<void> => {
  let currentState = initialState;
  let getCount = 0;
  await mockTabletGame(page, startedTabletGame(1));

  await page.route("**/api/game/1*", async (route: Route, request: Request) => {
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }
    getCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Game-State-Version": `v${getCount}` },
      body: JSON.stringify(currentState),
    });
  });

  await page.route("**/api/game/1/throw/delta", async (route: Route) => {
    currentState = stateAfterThrow;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        gameId: 1,
        stateVersion: "throw-v1",
        throw: null,
        scoreboardDelta: {
          changedPlayers: currentState.players.map((player) => ({
            playerId: player.id,
            name: player.name,
            score: player.score,
            position: player.position,
            placement: player.placement,
            isActive: player.isActive,
            isGuest: false,
            isBust: player.isBust,
          })),
          winnerId: null,
          status: currentState.status,
          currentRound: currentState.currentRound,
        },
        serverTs: new Date().toISOString(),
      }),
    });
  });
};

const openGame = async (page: Page): Promise<void> => {
  await page.goto("/game/1");
  await expect(page.getByRole("button", { name: "Back to Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
};

interface ScrollLayout {
  cardTopHit: boolean;
  cardBottomHit: boolean;
  documentScrollTop: number;
  listScrollTop: number;
}

/** Hit-tests the card's top and bottom edges, so a card under the keypad counts as hidden. */
const readScrollLayout = async (page: Page): Promise<ScrollLayout> =>
  page.getByRole("group", { name: "Player 7" }).evaluate((card) => {
    const rect = card.getBoundingClientRect();
    const centreX = rect.left + rect.width / 2;
    const hits = (y: number): boolean => card.contains(document.elementFromPoint(centreX, y));
    const list = card.closest<HTMLElement>("[class*='gameContent']");

    return {
      cardTopHit: hits(rect.top + 1),
      cardBottomHit: hits(rect.bottom - 1),
      documentScrollTop: document.scrollingElement?.scrollTop ?? -1,
      listScrollTop: list?.scrollTop ?? -1,
    };
  });

const viewports = [
  { label: "iPad Pro 11 landscape", device: devices["iPad Pro 11 landscape"] },
  { label: "iPad Pro 11 portrait", device: devices["iPad Pro 11"] },
  { label: "iPhone 13", device: devices["iPhone 13"] },
];

// Every viewport runs in WebKit, the engine of the iPad the game runs on.
test.use({ browserName: "webkit" });

for (const { label, device } of viewports) {
  test.describe(`Active player scroll on ${label}`, () => {
    // The device's defaultBrowserType would force a new worker, so pass the rest one by one.
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = device;
    test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

    test("a turn change to player 7 of 10 scrolls only the list and keeps the card above the keypad", async ({
      page,
    }) => {
      const beforeLastThrow = createState(6, 2, {
        6: { throwsInCurrentRound: 2, currentRoundThrows: [single(20), single(20)] },
      });
      const afterTurnChange = createState(7, 0, {
        6: {
          score: 241,
          roundHistory: [{ round: 1, throws: [single(20), single(20), single(20)] }],
        },
      });

      await mockAuth(page);
      await installGameRoutes(page, beforeLastThrow, afterTurnChange);
      await openGame(page);

      await page.getByRole("button", { name: "20", exact: true }).tap();
      await expect(page.getByRole("group", { name: "Player 7" })).toHaveAttribute(
        "aria-current",
        "true",
      );

      // The scroll is smooth, so poll until it settles with the card in view.
      await expect
        .poll(() => readScrollLayout(page))
        .toMatchObject({ cardTopHit: true, cardBottomHit: true, documentScrollTop: 0 });
      const { listScrollTop } = await readScrollLayout(page);
      expect(listScrollTop).toBeGreaterThan(0);
    });
  });
}
