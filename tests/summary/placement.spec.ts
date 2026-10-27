import { test, expect } from "../shared/test";
import { mockAdminSession } from "../shared/auth-route-mocks";
import { mockTabletGame } from "../shared/tablet-game-mocks";

for (const route of ["summary", "details"]) {
  test(`${route} shows the winner from the second lobby seat first by placement`, async ({
    page,
  }) => {
    await mockAdminSession(page);
    await mockTabletGame(page, { game: null, lastFinishedGameId: 42 });
    await page.route("**/api/game/42/settings", async (request) => {
      await request.fulfill({
        json: {
          gameId: 42,
          status: "finished",
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
    });
    await page.route("**/api/game/42/finished", async (request) => {
      await request.fulfill({
        json: {
          gameId: 42,
          winnerRoundsPlayed: 4,
          winnerRoundAverage: 60,
          finishedPlayers: [
            {
              playerId: 1,
              username: "Alice",
              position: 0,
              placement: 2,
              roundsPlayed: 5,
              roundAverage: 50,
            },
            {
              playerId: 2,
              username: "Bob",
              position: 1,
              placement: 1,
              roundsPlayed: 4,
              roundAverage: 60,
            },
            {
              playerId: 4,
              username: "Dan",
              position: 2,
              placement: 4,
              roundsPlayed: 6,
              roundAverage: 30,
            },
            {
              playerId: 3,
              username: "Cara",
              position: 3,
              placement: 3,
              roundsPlayed: 6,
              roundAverage: 40,
            },
          ],
        },
      });
    });

    await page.goto(`/${route}/42`);

    await expect(page.getByRole("heading", { name: /^(Alice|Bob|Cara)$/ })).toHaveText([
      "Bob",
      "Alice",
      "Cara",
    ]);
    // Podium cards have no accessible container role; their headings and rank text are visible.
    const winnerCard = page.getByText("WINNER", { exact: true }).locator("..");
    await expect(winnerCard.getByRole("heading", { name: "Bob" })).toBeVisible();
    await expect(winnerCard.getByText("1.", { exact: true })).toBeVisible();
    await expect(winnerCard.getByRole("group", { name: "three-dart average" })).toHaveText(
      "Ø AVG60.00",
    );
    const fourthPlace = page.getByText("Dan", { exact: true }).locator("..");
    await expect(fourthPlace.getByRole("heading", { name: "4", exact: true })).toBeVisible();
    await expect(fourthPlace.getByRole("group", { name: "three-dart average" })).toHaveText(
      "Ø AVG 30.00",
    );
  });
}
