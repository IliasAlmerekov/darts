// @vitest-environment jsdom

vi.mock("react-router-dom", () => ({
  useParams: () => routeParams,
}));

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinishedPlayerResponse } from "@/types";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient, queryClient as appQueryClient } from "@/shared/query/queryClient";
import { gameDetailLoader, useGameDetailPage } from "./useGameDetailPage";

const getFinishedGameMock = vi.fn();
let routeParams: { id?: string } = { id: "42" };
let testQueryClient: QueryClient;

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client: testQueryClient }, children);
}

function renderDetailHook() {
  return renderHook(() => useGameDetailPage(), { wrapper });
}

describe("gameDetailLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appQueryClient.clear();
  });

  it("should fill the finishedGame query when the route id is valid", async () => {
    const players = [buildFinishedPlayer({ username: "Alice", roundAverage: 75 })];
    getFinishedGameMock.mockResolvedValue(players);

    await gameDetailLoader({ params: { id: "42" }, request: new Request("http://localhost/") });

    expect(getFinishedGameMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    expect(appQueryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual(players);
  });

  it("should make no request when the summary page already cached the finished game", async () => {
    appQueryClient.setQueryData(gameQueries.finished(42).queryKey, [buildFinishedPlayer()]);

    await gameDetailLoader({ params: { id: "42" }, request: new Request("http://localhost/") });

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should throw a 400 Response when the route id is invalid", async () => {
    await expect(
      gameDetailLoader({ params: { id: "invalid" }, request: new Request("http://localhost/") }),
    ).rejects.toBeInstanceOf(Response);

    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should reject when the fetch fails, so the route error boundary shows it", async () => {
    getFinishedGameMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      gameDetailLoader({ params: { id: "42" }, request: new Request("http://localhost/") }),
    ).rejects.toThrow("network down");
  });
});

describe("useGameDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = { id: "42" };
    testQueryClient = createQueryClient();
  });

  it("should build podium and leaderboard from the cached finished game", () => {
    testQueryClient.setQueryData(gameQueries.finished(42).queryKey, [
      buildFinishedPlayer({ playerId: 1, username: "Alice", position: 1, roundAverage: 75 }),
      buildFinishedPlayer({ playerId: 2, username: "Bob", position: 2, roundAverage: 65 }),
    ]);

    const { result } = renderDetailHook();

    expect(result.current.standings).toHaveLength(2);
    expect(result.current.podiumData).toHaveLength(3);
    expect(result.current.standings[0]?.rounds[0]).toEqual({});
    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should show game B when game A's response arrives after B's", async () => {
    const gameA = deferred<FinishedPlayerResponse[]>();
    const gameB = deferred<FinishedPlayerResponse[]>();
    getFinishedGameMock.mockImplementation((id: number) =>
      id === 1 ? gameA.promise : gameB.promise,
    );
    routeParams = { id: "1" };
    const { result, rerender } = renderDetailHook();

    routeParams = { id: "2" };
    rerender();
    await act(async () => {
      gameB.resolve([buildFinishedPlayer({ playerId: 20, username: "Beta" })]);
      await gameB.promise;
    });
    await act(async () => {
      gameA.resolve([buildFinishedPlayer({ playerId: 10, username: "Alpha" })]);
      await gameA.promise;
    });

    await waitFor(() => {
      expect(result.current.standings.map((player) => player.name)).toEqual(["Beta"]);
    });
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
        testQueryClient.setQueryData(
          gameQueries.finished(42).queryKey,
          buildFinishedPlayerResponses().slice(0, playerCount),
        );

        const { result } = renderDetailHook();

        expect(result.current.standings).toStrictEqual(standings);
        expect(result.current.podiumData).toStrictEqual(podium);
        expect(result.current.leaderBoardList).toStrictEqual(leaderboard);
      },
    );
  });
});
