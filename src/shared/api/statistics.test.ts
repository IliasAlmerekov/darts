// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";
import { getGamesOverview, getPlayerStats } from "./statistics";

describe("statistics api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns paginated player stats when nested items are valid", async () => {
    const response = {
      items: [
        {
          id: 1,
          playerId: 1,
          name: "Alice",
          scoreAverage: 55.5,
          gamesPlayed: 10,
        },
      ],
      total: 1,
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce(response);

    await expect(getPlayerStats()).resolves.toEqual(response);
  });

  it("throws ApiError when player stats contain malformed nested item fields", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      items: [
        {
          id: 1,
          playerId: 1,
          name: "Alice",
          scoreAverage: "55.5",
          gamesPlayed: 10,
        },
      ],
      total: 1,
    });

    await expect(getPlayerStats()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for player stats",
      status: 200,
    });
  });

  it("returns games overview array when every game item is valid", async () => {
    const response = [
      {
        id: 10,
        winnerRounds: 6,
        winnerName: "Alice",
        playersCount: 2,
        date: "2026-03-09T12:00:00Z",
      },
    ];

    vi.spyOn(apiClient, "get").mockResolvedValueOnce(response);

    await expect(getGamesOverview()).resolves.toEqual(response);
  });

  it("throws ApiError when games overview contains malformed nested item fields", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce([
      {
        id: 10,
        winnerRounds: 6,
        winnerName: "Alice",
        playersCount: "2",
        date: "2026-03-09T12:00:00Z",
      },
    ]);

    await expect(getGamesOverview()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unexpected response shape for games overview",
      status: 200,
    });
  });
});
