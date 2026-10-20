// @vitest-environment node
vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  apiClient: {
    get: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentGame, getPlayerProfile } from "./player";
import { apiClient, ApiValidationError } from "./client";
import { respondWith } from "./test-utils";

// Contract examples: GET /api/player/current-game
const lobbyExample = { gameId: 12, status: "lobby" };
const noneExample = { gameId: null, status: null };

describe("getCurrentGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the player's current game from the lobby example", async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(lobbyExample));

    await expect(getCurrentGame(controller.signal)).resolves.toEqual({
      kind: "lobby",
      gameId: 12,
    });
    expect(apiClient.get).toHaveBeenCalledWith("/player/current-game", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("returns no game when the player has no current game", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(noneExample));

    await expect(getCurrentGame()).resolves.toEqual({ kind: "none" });
  });

  // The contract makes each field nullable on its own.
  it.each([
    { payload: { gameId: 12, status: null }, expected: { kind: "lobby", gameId: 12 } },
    { payload: { gameId: null, status: "lobby" }, expected: { kind: "none" } },
  ])("accepts a response where only one field is null: $payload", async ({ payload, expected }) => {
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(payload));

    await expect(getCurrentGame()).resolves.toEqual(expected);
  });

  it("rejects with ApiValidationError for an unknown status", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({ gameId: 12, status: "finished" }),
    );

    await expect(getCurrentGame()).rejects.toBeInstanceOf(ApiValidationError);
  });
});

// Contract example: GET /api/player/profile
const profileExample = {
  stats: { gamesPlayed: 3, scoreAverage: 45.25 },
  recentGames: [
    {
      gameId: 31,
      finishedAt: "2026-10-20T18:42:00+02:00",
      placement: 2,
      roundAverage: 45.3,
      participantsCount: 3,
      participants: [
        { playerId: 7, displayName: "Anna", placement: 1, isSelf: false },
        { playerId: 42, displayName: "test2", placement: 2, isSelf: true },
        { playerId: null, displayName: "Guest", placement: 3, isSelf: false },
      ],
    },
  ],
};

describe("getPlayerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the player's stats and recent games from the contract example", async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(profileExample));

    await expect(getPlayerProfile(controller.signal)).resolves.toEqual(profileExample);
    expect(apiClient.get).toHaveBeenCalledWith("/player/profile", {
      signal: controller.signal,
      validate: expect.any(Object),
    });
  });

  it("accepts null for every nullable field", async () => {
    const payload = {
      stats: { gamesPlayed: 0, scoreAverage: null },
      recentGames: [
        {
          gameId: 5,
          finishedAt: null,
          placement: null,
          roundAverage: 0,
          participantsCount: 1,
          participants: [{ playerId: null, displayName: null, placement: null, isSelf: true }],
        },
      ],
    };
    vi.mocked(apiClient.get).mockImplementationOnce(respondWith(payload));

    await expect(getPlayerProfile()).resolves.toEqual(payload);
  });

  it("rejects with ApiValidationError when recentGames is missing", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith({ stats: { gamesPlayed: 3, scoreAverage: 45.25 } }),
    );

    await expect(getPlayerProfile()).rejects.toBeInstanceOf(ApiValidationError);
  });
});
