// @vitest-environment node
vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { getFinishedGame, getGameSettings, getGameThrows } from "./game";
import { apiClient, ApiValidationError, clearUnauthorizedHandler } from "./client";
import { respondWith } from "./test-utils";

function createValidGameResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 520,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    players: [
      {
        id: 1,
        name: "P1",
        score: 301,
        isActive: true,
        isBust: false,
        isGuest: false,
        position: null,
        placement: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
    ],
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    ...overrides,
  };
}

describe("game reads", () => {
  beforeEach(() => {
    clearUnauthorizedHandler();
    vi.restoreAllMocks();
    vi.mocked(clientLogger.warn).mockReset();
  });

  it("returns data for valid getGameThrows response", async () => {
    const response = { type: "full-state", ...createValidGameResponse() };
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(response));

    const data = await getGameThrows(520);

    expect(data).toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/game/520",
      expect.objectContaining({ validate: expect.any(Object) }),
    );
  });

  it("forwards AbortSignal through getGameThrows", async () => {
    const controller = new AbortController();
    const response = createValidGameResponse();
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(response));

    await getGameThrows(520, controller.signal);

    expect(apiClient.get).toHaveBeenCalledWith("/game/520", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("normalizes the active player on a game read", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith(createValidGameResponse({ activePlayerId: null })),
    );

    expect((await getGameThrows(520)).activePlayerId).toBe(1);
  });

  it("forwards AbortSignal through getGameSettings", async () => {
    const controller = new AbortController();
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
        status: "lobby",
      }),
    );

    await getGameSettings(520, controller.signal);

    expect(apiClient.get).toHaveBeenCalledWith("/game/520/settings", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("rejects with ApiValidationError when getGameThrows receives invalid response shape", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith({ id: 520, players: [] }));

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when getGameThrows receives an unknown game status", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith(createValidGameResponse({ status: "active" })),
    );

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("rejects with ApiValidationError when getGameThrows receives invalid nested player data", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith(
        createValidGameResponse({
          players: [
            {
              id: 1,
              name: "P1",
              score: "301",
              isActive: true,
              isBust: false,
              isGuest: false,
              position: null,
              placement: null,
              throwsInCurrentRound: 0,
              currentRoundThrows: [],
              roundHistory: [],
            },
          ],
        }),
      ),
    );

    await expect(getGameThrows(520)).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("normalizes nullable summary envelope fields from getFinishedGame", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: "2026-03-10T12:00:00+00:00",
        winner: { id: 1, username: "Winner" },
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          {
            playerId: 1,
            username: "Winner",
            position: 1,
            placement: 1,
            roundsPlayed: 4,
            roundAverage: 62.5,
          },
          {
            playerId: null,
            username: null,
            position: null,
            placement: null,
            roundsPlayed: null,
            roundAverage: 0,
          },
        ],
      }),
    );

    await expect(getFinishedGame(520)).resolves.toEqual([
      {
        playerId: 1,
        username: "Winner",
        position: 1,
        placement: 1,
        roundsPlayed: 4,
        roundAverage: 62.5,
      },
      {
        playerId: 2,
        username: "Player 2",
        position: 1,
        placement: 2,
        roundsPlayed: 0,
        roundAverage: 0,
      },
    ]);
  });

  it("warns when a finished player arrives without roundsPlayed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: null,
        winner: null,
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          { playerId: 1, username: "Winner", position: 1, roundsPlayed: 4, roundAverage: 62.5 },
          { playerId: 7, username: "Bob", position: 2, roundsPlayed: null, roundAverage: 0 },
        ],
      }),
    );

    await getFinishedGame(520);

    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(clientLogger.warn)).toHaveBeenCalledWith(
      "game.finished-player.rounds-played.missing",
      { context: { gameId: 520, playerId: 7, index: 1 } },
    );
  });

  it("does not warn when every finished player has roundsPlayed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        gameId: 520,
        finishedAt: null,
        winner: null,
        winnerRoundsPlayed: 4,
        winnerRoundAverage: 62.5,
        finishedPlayers: [
          { playerId: 1, username: "Winner", position: 1, roundsPlayed: 4, roundAverage: 62.5 },
        ],
      }),
    );

    await getFinishedGame(520);

    expect(vi.mocked(clientLogger.warn)).not.toHaveBeenCalled();
  });
});
