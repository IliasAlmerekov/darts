import type { Page } from "@playwright/test";

/**
 * Answers the room SSE stream with no events. The long `retry` keeps EventSource from
 * reconnecting in a loop once the mocked body ends.
 */
export async function mockQuietRoomStream(page: Page): Promise<void> {
  await page.route(
    (url) => /^\/api\/room\/\d+\/stream$/.test(url.pathname),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "retry: 60000\n\n",
      });
    },
  );
}
