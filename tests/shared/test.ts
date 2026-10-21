import { test as base, expect } from "@playwright/test";
import { NO_TABLET_GAME } from "./tablet-game-mocks";

interface UnmockedApiGuardFixtures {
  failOnUnmockedApi: boolean;
  unmockedApiRequests: string[];
  backgroundApiMocks: void;
}

const EMPTY_PLAYER_STATS_RESPONSE = { limit: 20, offset: 0, total: 0, items: [] };

function isApiRequest(url: URL): boolean {
  return url.pathname === "/api" || url.pathname.startsWith("/api/");
}

/**
 * Mocked-suite `test`: every `/api` request must be answered by a route mock.
 *
 * The guard route is registered before the test body runs, and Playwright tries routes
 * in reverse registration order, so spec mocks always win. A request that reaches the
 * guard is aborted, so it never touches a real backend, and the test fails on teardown.
 */
export const test = base.extend<UnmockedApiGuardFixtures>({
  failOnUnmockedApi: [true, { option: true }],
  unmockedApiRequests: [
    async ({ page, failOnUnmockedApi }, use) => {
      const unmockedApiRequests: string[] = [];

      await page.route(isApiRequest, async (route) => {
        const request = route.request();
        unmockedApiRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort("failed");
      });

      await use(unmockedApiRequests);

      if (failOnUnmockedApi && unmockedApiRequests.length > 0) {
        throw new Error(
          `API requests without a route mock: ${[...new Set(unmockedApiRequests)].join(", ")}`,
        );
      }
    },
    { auto: true },
  ],
  // The app shell prefetches statistics on every page, and the admin routes read the tablet
  // game; specs about statistics or a game on the tablet override these.
  // Depending on the guard fixture registers this route after it, so this mock wins over the guard.
  backgroundApiMocks: [
    async ({ page, unmockedApiRequests: _guardRegisteredFirst }, use) => {
      await page.route(
        (url) => url.pathname === "/api/players/stats",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(EMPTY_PLAYER_STATS_RESPONSE),
          });
        },
      );
      await page.route(
        (url) => url.pathname === "/api/tablet/game",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(NO_TABLET_GAME),
          });
        },
      );

      await use();
    },
    { auto: true },
  ],
});

export { expect };
export type { Locator, Page, Request, Route } from "@playwright/test";
