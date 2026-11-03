import { test, expect } from "../shared/test";
import { createGame, loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";
import { fulfillRoomStream, isRoomStreamUrl } from "../shared/room-stream-mocks";

function playersEvent(payload: unknown): string {
  return `event: players\ndata: ${JSON.stringify(payload)}\n\n`;
}

test.describe("Lobby roster stream", () => {
  test("ignores a malformed players event and shows the next valid roster", async ({ page }) => {
    await mockLobbyApi(page);
    // The malformed event gets a connection of its own, so the page renders it before the
    // valid one arrives. The valid event comes on the reconnect after the mocked body ends.
    let streamRequests = 0;
    await page.route(isRoomStreamUrl, (route) => {
      streamRequests += 1;
      return fulfillRoomStream(
        route,
        streamRequests === 1
          ? playersEvent({
              players: [
                { id: 1, name: { first: "Mallory" }, position: 0 },
                { id: 2, name: "Trent", position: "1" },
              ],
            })
          : playersEvent({
              players: [
                { id: 3, name: "Alice", position: 0, placement: null, isGuest: false },
                { id: 4, name: "Bob", position: 1, placement: null, isGuest: true },
              ],
              count: 2,
            }),
      );
    });

    await loginAsAdmin(page);
    await createGame(page);

    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("2/10")).toBeVisible();
    await expect(page.getByText("Trent")).toHaveCount(0);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });
});
