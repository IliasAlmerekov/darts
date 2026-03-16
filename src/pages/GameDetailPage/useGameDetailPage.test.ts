// @vitest-environment jsdom

vi.mock("react-router-dom", () => ({
  useLoaderData: () => useLoaderDataMock(),
}));

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
}));

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinishedPlayerResponse } from "@/types";
import { gameDetailLoader, useGameDetailPage } from "./useGameDetailPage";

const getFinishedGameMock = vi.fn();
const useLoaderDataMock = vi.fn();

function buildFinishedPlayer(
  overrides: Partial<FinishedPlayerResponse> = {},
): FinishedPlayerResponse {
  return {
    playerId: 1,
    username: "Player",
    position: 1,
    roundsPlayed: 4,
    roundAverage: 50,
    ...overrides,
  };
}

describe("gameDetailLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call getFinishedGame when route id is valid", async () => {
    const players = [buildFinishedPlayer({ username: "Alice", roundAverage: 75 })];
    getFinishedGameMock.mockResolvedValue(players);

    const result = await gameDetailLoader({
      params: { id: "42" },
      request: new Request("http://localhost/"),
    });

    expect(getFinishedGameMock).toHaveBeenCalledWith(42);
    expect(result).toBe(players);
  });

  it("should throw a 400 Response when the route id is invalid", async () => {
    await expect(
      gameDetailLoader({ params: { id: "invalid" }, request: new Request("http://localhost/") }),
    ).rejects.toBeInstanceOf(Response);

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });
});

describe("useGameDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build podium and leaderboard when loader data is valid", () => {
    useLoaderDataMock.mockReturnValue([
      buildFinishedPlayer({ playerId: 1, username: "Alice", position: 1, roundAverage: 75 }),
      buildFinishedPlayer({ playerId: 2, username: "Bob", position: 2, roundAverage: 65 }),
    ]);

    const { result } = renderHook(() => useGameDetailPage());

    expect(result.current.newList).toHaveLength(2);
    expect(result.current.podiumData).toHaveLength(3);
    expect(result.current.newList[0]?.rounds[0]).toEqual({});
  });

  it("should throw when loader data is not an array", () => {
    useLoaderDataMock.mockReturnValue(null);

    expect(() => renderHook(() => useGameDetailPage())).toThrow(
      "Unexpected loader data format for GameDetailPage",
    );
  });
});
