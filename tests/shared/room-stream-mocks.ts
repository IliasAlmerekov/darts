import type { Page, Route } from "@playwright/test";

/** Matches the room SSE stream URL for any room id. */
export function isRoomStreamUrl(url: URL): boolean {
  return /^\/api\/room\/\d+\/stream$/.test(url.pathname);
}

/**
 * Answers a room SSE request with the given raw events. The long `retry` keeps EventSource
 * from reconnecting in a loop once the mocked body ends.
 */
export async function fulfillRoomStream(route: Route, events = ""): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    body: `retry: 60000\n\n${events}`,
  });
}

/** Answers the room SSE stream with no events. */
export async function mockQuietRoomStream(page: Page): Promise<void> {
  await page.route(isRoomStreamUrl, (route) => fulfillRoomStream(route));
}
