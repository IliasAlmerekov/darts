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

  it("normalizes legacy player stats fields from the backend", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      items: [
        {
          playerId: 1,
          username: "Alice",
          average: "55.5",
          gamesPlayed: "10",
        },
      ],
      total: "1",
    });

    await expect(getPlayerStats()).resolves.toEqual({
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
    });
  });

  it("accepts nullable optional statistics fields and keeps them undefined", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce([
      {
        id: 2,
        playerId: 2,
        username: "Bob",
        average: null,
        gamesPlayed: null,
      },
    ]);

    await expect(getPlayerStats()).resolves.toEqual({
      items: [
        {
          id: 2,
          playerId: 2,
          name: "Bob",
        },
      ],
      total: 1,
    });
  });

  it("throws ApiError when player stats contain malformed nested item fields", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      items: [
        {
          id: 1,
          playerId: 1,
          name: "Alice",
          average: "not-a-number",
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

  it("normalizes games overview arrays to a paginated response", async () => {
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

    await expect(getGamesOverview()).resolves.toEqual({
      items: response,
      total: 1,
    });
  });

  it("normalizes stringified games overview numbers from the backend", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      items: [
        {
          id: "10",
          winnerRounds: "6",
          winnerName: "Alice",
          playersCount: "2",
          date: "2026-03-09T12:00:00Z",
        },
      ],
      total: "1",
    });

    await expect(getGamesOverview()).resolves.toEqual({
      items: [
        {
          id: 10,
          winnerRounds: 6,
          winnerName: "Alice",
          playersCount: 2,
          date: "2026-03-09T12:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("accepts swagger games overview items with nullable winner and finishedAt alias", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      items: [
        {
          id: 10,
          winnerRounds: 6,
          winnerName: null,
          playersCount: 2,
          finishedAt: "2026-03-09T12:00:00Z",
        },
      ],
      total: 1,
    });

    await expect(getGamesOverview()).resolves.toEqual({
      items: [
        {
          id: 10,
          winnerRounds: 6,
          winnerName: null,
          playersCount: 2,
          date: "2026-03-09T12:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("throws ApiError when games overview contains malformed nested item fields", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce([
      {
        id: 10,
        winnerRounds: 6,
        winnerName: "Alice",
        playersCount: "two",
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
