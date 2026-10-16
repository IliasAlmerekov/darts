import type { Page } from "@playwright/test";

/** Body of `GET /api/player/current-game`. */
interface CurrentGameBody {
  gameId: number | null;
  status: "lobby" | "started" | null;
}

export const lobbyCurrentGame = (gameId: number): CurrentGameBody => ({
  gameId,
  status: "lobby",
});

export const startedCurrentGame = (gameId: number): CurrentGameBody => ({
  gameId,
  status: "started",
});

export const NO_CURRENT_GAME: CurrentGameBody = { gameId: null, status: null };

/** Changes the body that later current-game requests receive. */
type AnswerCurrentGame = (body: CurrentGameBody) => void;

/**
 * Answers the Waiting room's current-game polling with `body`. Call the returned function
 * to answer every later request with another body.
 */
export async function mockCurrentGame(
  page: Page,
  body: CurrentGameBody,
): Promise<AnswerCurrentGame> {
  let currentBody = body;

  await page.route("**/api/player/current-game", async (route) => {
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
