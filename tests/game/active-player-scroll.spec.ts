// #443: on the game page only the player list scrolls, and a turn change leaves the active
// player's card fully visible above the keypad.

import { devices } from "@playwright/test";
import type { BackendPlayer, GameThrowsResponse } from "@/shared/api/game";
import {
  buildBackendPlayer,
  buildGameThrowsResponse,
} from "../../src/shared/types/game.test-support";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { test, expect, type Page } from "../shared/test";
import { mockTabletGame, startedTabletGame } from "../shared/tablet-game-mocks";

const twenty = { value: 20, isDouble: false, isTriple: false, isBust: false };

/** `count` players with `activeId` to throw. Player 6 has two darts in, or all three once 7 is up. */
const buildState = (count: number, activeId: number): GameThrowsResponse =>
  buildGameThrowsResponse({
    activePlayerId: activeId,
    currentThrowCount: activeId === 6 ? 2 : 0,
    players: Array.from({ length: count }, (_, index): BackendPlayer => {
      const id = index + 1;
      const sixMidTurn = id === 6 && activeId === 6;
      const sixDone = id === 6 && activeId === 7;
      return buildBackendPlayer({
        id,
        name: `Player ${id}`,
        isActive: id === activeId,
        position: index,
        score: sixDone ? 441 : 501,
        throwsInCurrentRound: sixMidTurn ? 2 : 0,
        currentRoundThrows: sixMidTurn ? [twenty, twenty] : [],
        roundHistory: sixDone ? [{ round: 1, throws: [twenty, twenty, twenty] }] : [],
      });
    }),
  });

const openGame = async (page: Page, before: GameThrowsResponse, after = before): Promise<void> => {
  let state = before;
  await mockAdminSession(page);
  await mockTabletGame(page, startedTabletGame(1));
  await page.route("**/api/game/1*", async (route, request) => {
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: state, headers: { "X-Game-State-Version": "v1" } });
  });
  await page.route("**/api/game/1/throw/delta", async (route) => {
    state = after;
    await route.fulfill({
      json: {
        success: true,
        gameId: 1,
        stateVersion: "throw-v1",
        throw: null,
        scoreboardDelta: {
          changedPlayers: state.players.map((player) => ({
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
          status: state.status,
          currentRound: state.currentRound,
        },
        serverTs: new Date().toISOString(),
      },
    });
  });
  await page.goto("/game/1");
  await expect(
    page.getByRole("group", { name: `Player ${before.activePlayerId}`, exact: true }),
  ).toBeVisible();
};

/** Hit-tests the card's top and bottom edges, so a card under the keypad counts as hidden. */
const readCardHits = (page: Page): Promise<{ top: boolean; bottom: boolean }> =>
  page.getByRole("group", { name: "Player 7" }).evaluate((card) => {
    const rect = card.getBoundingClientRect();
    const hits = (y: number): boolean =>
      card.contains(document.elementFromPoint(rect.left + rect.width / 2, y));
    return { top: hits(rect.top + 1), bottom: hits(rect.bottom - 1) };
  });

const readScrollTops = (page: Page): Promise<{ page: number; list: number }> =>
  page.evaluate(() => ({
    page: document.scrollingElement?.scrollTop ?? -1,
    list: document.querySelector("[class*='gameContent']")?.scrollTop ?? -1,
  }));

const changeTurnToPlayerSeven = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "20", exact: true }).tap();
  await expect(page.getByRole("group", { name: "Player 7" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  // The scroll is smooth, so poll until it settles with the card in view.
  await expect.poll(() => readCardHits(page)).toEqual({ top: true, bottom: true });
};

const deviceOptions = (device: (typeof devices)[string]) => {
  // The device's defaultBrowserType would force a new worker, so pass the rest one by one.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = device;
  return { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };
};

// Every viewport runs in WebKit, the engine of the iPad the game runs on.
test.use({ browserName: "webkit" });

// A phone in landscape has no room for header, list and keypad, so its page scrolls too.
const viewports = [
  { label: "iPad Pro 11 landscape", device: devices["iPad Pro 11 landscape"], pageScrolls: false },
  { label: "iPad Pro 11 portrait", device: devices["iPad Pro 11"], pageScrolls: false },
  { label: "iPhone 13", device: devices["iPhone 13"], pageScrolls: false },
  { label: "iPhone 13 landscape", device: devices["iPhone 13 landscape"], pageScrolls: true },
];

for (const { label, device, pageScrolls } of viewports) {
  test.describe(`Game page scroll on ${label}`, () => {
    test.use(deviceOptions(device));

    test("a turn change to player 7 of 10 keeps the card fully visible", async ({ page }) => {
      await openGame(page, buildState(10, 6), buildState(10, 7));
      await changeTurnToPlayerSeven(page);

      const scrollTops = await readScrollTops(page);
      expect(scrollTops.list).toBeGreaterThan(0);
      if (!pageScrolls) {
        expect(scrollTops.page).toBe(0);
      }
    });

    test("three players fit without scrolling", async ({ page }) => {
      test.skip(pageScrolls, "the keypad alone fills this viewport");
      await openGame(page, buildState(3, 1));

      const overflow = await page.evaluate(() => {
        const list = document.querySelector("[class*='gameContent']");
        const root = document.scrollingElement;
        return {
          list: list ? list.scrollHeight - list.clientHeight : -1,
          page: root ? root.scrollHeight - root.clientHeight : -1,
        };
      });
      expect(overflow).toEqual({ list: 0, page: 0 });
    });
  });
}

test.describe("Game page scroll on iPad Pro 11 landscape, other states", () => {
  test.use(deviceOptions(devices["iPad Pro 11 landscape"]));

  test("the error banner leaves room for player 7 of 10 after a turn change", async ({ page }) => {
    await page.route("**/api/game/1/abort", (route) =>
      route.fulfill({ status: 500, json: { error: "Internal error" } }),
    );
    await openGame(page, buildState(10, 6), buildState(10, 7));
    await page.getByRole("button", { name: "Back to Home" }).tap();
    await page.getByRole("button", { name: "Yes" }).tap();
    await expect(page.getByText("Game action failed")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).tap();

    await changeTurnToPlayerSeven(page);
    expect((await readScrollTops(page)).page).toBe(0);
  });

  test("the finished players list scrolls fully into view", async ({ page }) => {
    const state = buildState(4, 2);
    state.players[0] = buildBackendPlayer({ score: 0, placement: 1 });
    await openGame(page, state);
    const finishedPlayer = page.getByRole("listitem").filter({ hasText: "Player 1" });
    await finishedPlayer.scrollIntoViewIfNeeded();

    await expect
      .poll(() =>
        finishedPlayer.evaluate((row) => {
          const rect = row.getBoundingClientRect();
          const hits = (y: number): boolean =>
            row.contains(document.elementFromPoint(rect.left + rect.width / 2, y));
          return rect.height > 0 && hits(rect.top + 1) && hits(rect.bottom - 1);
        }),
      )
      .toBe(true);
  });
});
