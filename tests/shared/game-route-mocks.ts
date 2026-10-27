import type { Page } from "@playwright/test";
import { fulfillJson } from "./json-response";

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
