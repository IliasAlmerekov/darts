import { test, expect } from "../shared/test";
import { createGame, loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";
import { fulfillRoomStream, isRoomStreamUrl } from "../shared/room-stream-mocks";

const INVALID_PAYLOAD_LOG = "room.players.sse-invalid-payload";

function playersEvent(payload: unknown): string {
  return `event: players\ndata: ${JSON.stringify(payload)}\n\n`;
}

test.describe("Lobby roster stream", () => {
  test("keeps the last valid roster through malformed players events", async ({ page }) => {
    await mockLobbyApi(page);

    const invalidPayloadLogs: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes(INVALID_PAYLOAD_LOG)) {
        invalidPayloadLogs.push(message.text());
      }
    });

    // Each event gets a connection of its own; the next one comes on the reconnect after the
    // mocked body ends. The last valid roster waits until the malformed events are checked.
    let releaseFinalRoster!: () => void;
    const finalRosterReleased = new Promise<void>((resolve) => {
      releaseFinalRoster = resolve;
    });
    const streamEvents = [
      playersEvent({
        players: [
          { id: 1, name: "Alice", position: 0, placement: null, isGuest: false },
          { id: 2, name: "Bob", position: 1, placement: null, isGuest: true },
        ],
        count: 2,
      }),
      playersEvent({ players: [{ id: 3, name: "Trent", position: "1" }] }),
      playersEvent({ players: [{ id: 4, name: { first: "Mallory" }, position: 0 }] }),
      playersEvent({
        players: [{ id: 5, name: "Carol", position: 0, placement: null, isGuest: false }],
        count: 1,
      }),
    ];
    let streamRequests = 0;
    await page.route(isRoomStreamUrl, async (route) => {
      const index = Math.min(streamRequests, streamEvents.length - 1);
      streamRequests += 1;
      if (index === streamEvents.length - 1) {
        await finalRosterReleased;
      }
      await fulfillRoomStream(route, streamEvents[index]);
    });

    await loginAsAdmin(page);
    await createGame(page);

    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("2/10")).toBeVisible();

    // A string position: logged and dropped, the roster stays.
    await expect.poll(() => invalidPayloadLogs.length).toBe(1);
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("Trent")).toHaveCount(0);

    // An object as name: logged and dropped, no error boundary.
    await expect.poll(() => invalidPayloadLogs.length).toBe(2);
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("2/10")).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);

    releaseFinalRoster();

    await expect(page.getByText("Carol")).toBeVisible();
    await expect(page.getByText("1/10")).toBeVisible();
    await expect(page.getByText("Alice")).toHaveCount(0);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });
});
