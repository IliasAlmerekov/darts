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
import type { FinishedPlayerResponse } from "@/shared/api/game";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import { useGameDetailPage } from "./useGameDetailPage";

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
    placement: 1,
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

    expect(result.current.podiumData.map((entry) => entry.name)).toEqual(["Alice", "Bob", "-"]);
    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should not read 1e3 as game 1000", () => {
    routeParams = { id: "1e3" };

    renderDetailHook();

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
      expect(result.current.podiumData.map((entry) => entry.name)).toEqual(["Beta"]);
    });
  });

  describe("standings", () => {
    const [alice, bob, cara, dan] = buildExpectedStandings();
    const placeholder = buildExpectedPodiumPlaceholder();

    it.each([
      {
        playerCount: 2,
        podium: [alice, bob, placeholder],
        leaderboard: [],
      },
      {
        playerCount: 3,
        podium: [alice, bob, cara],
        leaderboard: [],
      },
      {
        playerCount: 4,
        podium: [alice, bob, cara],
        leaderboard: [dan],
      },
    ])(
      "should build podium and leaderboard when the game had $playerCount players",
      ({ playerCount, podium, leaderboard }) => {
        testQueryClient.setQueryData(
          gameQueries.finished(42).queryKey,
          buildFinishedPlayerResponses().slice(0, playerCount),
        );

        const { result } = renderDetailHook();

        expect(result.current.podiumData).toStrictEqual(podium);
        expect(result.current.leaderBoardList).toStrictEqual(leaderboard);
      },
    );
  });
});
