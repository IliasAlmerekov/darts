import type { Page, Route } from "@playwright/test";

export async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

/** Answers `GET /api/game/<id>` with `state`; other methods fall through to later routes. */
export async function mockGameState(page: Page, gameId: number, state: unknown): Promise<void> {
  await page.route(`**/api/game/${gameId}`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await fulfillJson(route, state);
  });
}
