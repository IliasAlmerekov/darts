import type { Page } from "@playwright/test";

/** Body of `GET /api/tablet/game`. */
interface TabletGameBody {
  game: { id: number; status: "lobby" | "started" } | null;
  lastFinishedGameId: number | null;
}

export const NO_TABLET_GAME: TabletGameBody = { game: null, lastFinishedGameId: null };

export const lobbyTabletGame = (id: number): TabletGameBody => ({
  game: { id, status: "lobby" },
  lastFinishedGameId: null,
});

export const startedTabletGame = (id: number): TabletGameBody => ({
  game: { id, status: "started" },
  lastFinishedGameId: null,
});

/** Changes the body that later tablet game requests receive. */
type AnswerTabletGame = (body: TabletGameBody) => void;

/**
 * Answers the admin routes' tablet game reads with `body`. Call the returned function to
 * answer every later request with another body.
 */
export async function mockTabletGame(
  page: Page,
  body: TabletGameBody = NO_TABLET_GAME,
): Promise<AnswerTabletGame> {
  let currentBody = body;

  await page.route("**/api/tablet/game", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentBody),
    });
  });

  return (nextBody) => {
    currentBody = nextBody;
  };
}
