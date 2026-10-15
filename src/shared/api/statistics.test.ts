// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiValidationError } from "./client";
import { getGamesOverview, getPlayerStats } from "./statistics";
import { respondWith } from "./test-utils";

// The contract has no example for PlayerStatsResponseDto; this payload follows its schema.
const playerStatsPayload = {
  limit: 10,
  offset: 0,
  total: 1,
  items: [{ playerId: 1, name: "Alice", gamesPlayed: 10, scoreAverage: 55.5 }],
};

// The contract has no example for GameOverviewResponseDto; this payload follows its schema.
const gamesOverviewPayload = {
  limit: 9,
  offset: 0,
  total: 2,
  items: [
    {
      id: 10,
      date: "2026-03-09T12:00:00Z",
      finishedAt: "2026-03-09T12:30:00Z",
      playersCount: 2,
      winnerName: "Alice",
      winnerId: 1,
      winnerRounds: 6,
    },
    { id: 11, playersCount: 3, winnerRounds: 8 },
  ],
};

describe("getPlayerStats", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a contract PlayerStatsResponseDto to paginated player rows", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockImplementationOnce(respondWith(playerStatsPayload));

    await expect(getPlayerStats(10, 0, "average:desc")).resolves.toEqual({
      items: [{ id: 1, playerId: 1, name: "Alice", gamesPlayed: 10, scoreAverage: 55.5 }],
      total: 1,
    });
    expect(getSpy).toHaveBeenCalledWith("/players/stats", {
      query: { limit: 10, offset: 0, sort: "average:desc" },
      signal: undefined,
      validate: expect.any(Object),
    });
  });

  it("rejects with ApiValidationError when an item has a non-numeric gamesPlayed", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        ...playerStatsPayload,
        items: [{ playerId: 1, name: "Alice", gamesPlayed: "10", scoreAverage: 55.5 }],
      }),
    );

    await expect(getPlayerStats()).rejects.toBeInstanceOf(ApiValidationError);
  });
});

describe("getGamesOverview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a contract GameOverviewResponseDto, including items without optional fields", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(respondWith(gamesOverviewPayload));

    await expect(getGamesOverview()).resolves.toEqual({
      items: [
        {
          id: 10,
          winnerRounds: 6,
          winnerName: "Alice",
          playersCount: 2,
          date: "2026-03-09T12:00:00Z",
        },
        { id: 11, winnerRounds: 8, winnerName: null, playersCount: 3, date: null },
      ],
      total: 2,
    });
  });

  it("falls back to finishedAt when date is null", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        limit: 9,
        offset: 0,
        total: 1,
        items: [
          {
            id: 10,
            date: null,
            finishedAt: "2026-03-09T12:30:00Z",
            playersCount: 2,
            winnerRounds: 6,
          },
        ],
      }),
    );

    const overview = await getGamesOverview();

    expect(overview.items[0]?.date).toBe("2026-03-09T12:30:00Z");
  });

  it("rejects with ApiValidationError when an item has a non-numeric playersCount", async () => {
    vi.spyOn(apiClient, "get").mockImplementationOnce(
      respondWith({
        ...gamesOverviewPayload,
        items: [{ id: 10, playersCount: "two", winnerRounds: 6 }],
      }),
    );

    await expect(getGamesOverview()).rejects.toBeInstanceOf(ApiValidationError);
  });
});
