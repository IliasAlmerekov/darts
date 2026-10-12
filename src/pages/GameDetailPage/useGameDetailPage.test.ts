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
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
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

    expect(result.current.standings).toHaveLength(2);
    expect(result.current.podiumData).toHaveLength(3);
    expect(result.current.standings[0]?.rounds[0]).toEqual({});
  });

  it("should throw when loader data is not an array", () => {
    useLoaderDataMock.mockReturnValue(null);

    expect(() => renderHook(() => useGameDetailPage())).toThrow(
      "Unexpected loader data format for GameDetailPage",
    );
  });

  describe("standings", () => {
    const [alice, bob, cara, dan] = buildExpectedStandings();
    const placeholder = buildExpectedPodiumPlaceholder();

    it.each([
      {
        playerCount: 2,
        standings: [alice, bob],
        podium: [alice, bob, placeholder],
        leaderboard: [],
      },
      {
        playerCount: 3,
        standings: [alice, bob, cara],
        podium: [alice, bob, cara],
        leaderboard: [],
      },
      {
        playerCount: 4,
        standings: [alice, bob, cara, dan],
        podium: [alice, bob, cara],
        leaderboard: [dan],
      },
    ])(
      "should build podium and leaderboard when the game had $playerCount players",
      ({ playerCount, standings, podium, leaderboard }) => {
        useLoaderDataMock.mockReturnValue(buildFinishedPlayerResponses().slice(0, playerCount));

        const { result } = renderHook(() => useGameDetailPage());

        expect(result.current.standings).toStrictEqual(standings);
        expect(result.current.podiumData).toStrictEqual(podium);
        expect(result.current.leaderBoardList).toStrictEqual(leaderboard);
      },
    );
  });
});
