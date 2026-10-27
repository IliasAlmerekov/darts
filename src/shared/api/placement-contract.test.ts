// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { apiClient, ApiValidationError } from "./client";
import { getFinishedGame, getGameThrows, recordThrow } from "./game";
import { addGuestPlayer } from "./room";
import { respondWith } from "./test-utils";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const summary = (placement: unknown) => ({
  gameId: 1,
  winnerRoundsPlayed: 4,
  winnerRoundAverage: 60,
  finishedPlayers: [
    { playerId: 2, username: "Bob", position: 1, placement, roundsPlayed: 4, roundAverage: 60 },
  ],
});

const ack = (fields: object) => ({
  success: true,
  gameId: 1,
  stateVersion: "v1",
  serverTs: "2026-10-27T10:00:00Z",
  scoreboardDelta: {
    status: "started",
    currentRound: 1,
    changedPlayers: [
      {
        playerId: 2,
        name: "Bob",
        score: 0,
        isActive: false,
        isGuest: false,
        position: 1,
        ...fields,
      },
    ],
  },
});

describe("placement response contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([1, null])(
    "preserves placement %s in game state without changing turn order",
    async (placement) => {
      vi.mocked(apiClient.get).mockImplementationOnce(
        respondWith(
          buildGameThrowsResponse({
            players: [{ ...buildBackendPlayer({ position: 1 }), placement }],
          }),
        ),
      );
      const game = await getGameThrows(1);
      expect(game.players[0]).toMatchObject({ position: 1, placement });
    },
  );

  it.each([1, null])(
    "reads finished placement %s independently from turn order",
    async (placement) => {
      vi.mocked(apiClient.get).mockImplementationOnce(respondWith(summary(placement)));
      expect(await getFinishedGame(1)).toEqual([
        {
          playerId: 2,
          username: "Bob",
          position: 1,
          placement: placement ?? 1,
          roundsPlayed: 4,
          roundAverage: 60,
        },
      ]);
    },
  );

  it("falls back to the summary array index when placement is absent", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({
        ...summary(null),
        finishedPlayers: [
          { playerId: 2, username: "Bob", position: 8, roundsPlayed: 4, roundAverage: 60 },
        ],
      }),
    );
    expect((await getFinishedGame(1))[0]).toMatchObject({ position: 8, placement: 1 });
  });

  it.each([1, null])("preserves placement %s in scoreboard deltas", async (placement) => {
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(ack({ placement })));
    const result = await recordThrow(1, { playerId: 2, value: 20 });
    expect(result.scoreboardDelta.changedPlayers[0]).toMatchObject({ position: 1, placement });
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(ack({})));
    const omitted = await recordThrow(1, { playerId: 2, value: 20 });
    expect(omitted.scoreboardDelta.changedPlayers[0]).not.toHaveProperty("placement");
  });

  it.each([1, null])("preserves placement %s in room players", async (placement) => {
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: true, player: { id: 2, name: "Bob", position: 1, placement } }),
    );
    expect(await addGuestPlayer(1, { username: "Bob" })).toMatchObject({ position: 1, placement });
  });

  it.each(["1", 1.5])("rejects invalid placement %s in every response", async (placement) => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({
        ...buildGameThrowsResponse(),
        players: [{ ...buildBackendPlayer(), placement }],
      }),
    );
    await expect(getGameThrows(1)).rejects.toBeInstanceOf(ApiValidationError);
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(summary(placement)));
    await expect(getFinishedGame(1)).rejects.toBeInstanceOf(ApiValidationError);
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith(ack({ placement })));
    await expect(recordThrow(1, { playerId: 2, value: 20 })).rejects.toBeInstanceOf(
      ApiValidationError,
    );
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: true, player: { id: 2, name: "Bob", position: 1, placement } }),
    );
    await expect(addGuestPlayer(1, { username: "Bob" })).rejects.toBeInstanceOf(ApiValidationError);
  });
});
