// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  finishGame: vi.fn(),
  getGameThrows: vi.fn(),
  recordThrow: vi.fn(),
  undoLastThrow: vi.fn(),
}));

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
}));

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishGame,
  getGameThrows,
  recordThrow,
  type GameSummaryResponse,
  type ThrowAckResponse,
  type GameThrowsResponse,
} from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import { QueryClientWrapper } from "@/test/QueryClientWrapper";
import { $gameData, resetGameStore, setGameData } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { useGameSession } from "./useGameSession";

const getGameThrowsMock = vi.mocked(getGameThrows);
const recordThrowMock = vi.mocked(recordThrow);
const finishGameMock = vi.mocked(finishGame);

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function buildGame(id: number, aliceScore = 301): GameThrowsResponse {
  return buildGameThrowsResponse({
    id,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      buildBackendPlayer({ id: 1, name: "Alice", score: aliceScore, isActive: true }),
      buildBackendPlayer({ id: 2, name: "Bob", score: 301 }),
    ],
  });
}

function buildThrowAck(gameId: number): ThrowAckResponse {
  return {
    type: "ack",
    success: true,
    gameId,
    stateVersion: "v2",
    throw: null,
    scoreboardDelta: {
      changedPlayers: [
        { playerId: 1, name: "Alice", score: 281, isActive: true, isGuest: false },
        { playerId: 2, name: "Bob", score: 301, isActive: false, isGuest: false },
      ],
      winnerId: null,
      status: "started",
      currentRound: 1,
    },
    serverTs: "2026-10-23T10:00:00Z",
  };
}

async function flushResponses(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("useGameSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameStore();
  });

  describe("finish game from the overlay", () => {
    const summary: GameSummaryResponse = [
      {
        playerId: 1,
        username: "Alice",
        position: 1,
        placement: 1,
        roundsPlayed: 3,
        roundAverage: 100,
      },
      { playerId: 2, username: "Bob", position: 2, placement: 2, roundsPlayed: 3, roundAverage: 0 },
      {
        playerId: 3,
        username: "Cara",
        position: 3,
        placement: 3,
        roundsPlayed: 3,
        roundAverage: 0,
      },
    ];

    function buildCheckoutAck(): ThrowAckResponse {
      return {
        ...buildThrowAck(1),
        scoreboardDelta: {
          changedPlayers: [
            { playerId: 1, name: "Alice", score: 0, isActive: false, isGuest: false },
            { playerId: 2, name: "Bob", score: 301, isActive: true, isGuest: false },
          ],
          winnerId: 1,
          status: "started",
          currentRound: 1,
        },
      };
    }

    function buildCheckoutGame(): GameThrowsResponse {
      const game = buildGame(1, 20);
      game.players.push(buildBackendPlayer({ id: 3, name: "Cara", score: 301 }));
      return game;
    }

    async function renderCheckedOutGame(client = createQueryClient()) {
      getGameThrowsMock.mockResolvedValueOnce(buildCheckoutGame());
      const ack = createDeferred<ThrowAckResponse>();
      recordThrowMock.mockReturnValueOnce(ack.promise);
      const rendered = renderHook(() => useGameSession(1), {
        wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
      });
      await waitFor(() => expect(rendered.result.current.view.canThrow).toBe(true));
      act(() => rendered.result.current.commands.throwDart(20));
      return { ...rendered, ack };
    }

    it("waits for the checkout ack, finishes once and seeds the summary", async () => {
      const client = createQueryClient();
      const { result, ack } = await renderCheckedOutGame(client);
      expect(result.current.view).toMatchObject({
        shouldShowFinishOverlay: true,
        canFinishGame: false,
      });
      act(() => result.current.commands.finishGame());
      expect(finishGameMock).not.toHaveBeenCalled();

      ack.resolve(buildCheckoutAck());
      await waitFor(() => expect(result.current.view.canFinishGame).toBe(true));
      const finished = createDeferred<GameSummaryResponse>();
      finishGameMock.mockReturnValueOnce(finished.promise);
      act(() => {
        result.current.commands.finishGame();
        result.current.commands.finishGame();
      });

      expect(finishGameMock).toHaveBeenCalledTimes(1);
      expect(finishGameMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
      expect(result.current.view.isFinishPending).toBe(true);
      finished.resolve(summary);
      await waitFor(() => expect(result.current.view.isFinished).toBe(true));
      expect(client.getQueryData(gameQueries.finished(1).queryKey)).toEqual(summary);
    });
  });

  it("aborts the load of the previous game and ignores its late answer", async () => {
    const firstLoad = createDeferred<GameThrowsResponse>();
    const secondLoad = createDeferred<GameThrowsResponse>();
    getGameThrowsMock.mockImplementation((gameId) =>
      gameId === 1 ? firstLoad.promise : secondLoad.promise,
    );
    setGameData(buildGame(1));

    const { result, rerender } = renderHook(({ gameId }) => useGameSession(gameId), {
      wrapper: QueryClientWrapper,
      initialProps: { gameId: 1 as number | null },
    });
    expect(result.current.view.game?.id).toBe(1);

    rerender({ gameId: 2 });
    await waitFor(() => {
      expect(result.current.view.game).toBeNull();
    });
    const firstSignal = getGameThrowsMock.mock.calls[0]?.[1];
    expect(firstSignal?.aborted).toBe(true);

    secondLoad.resolve(buildGame(2));
    await waitFor(() => {
      expect(result.current.view.game?.id).toBe(2);
    });

    firstLoad.resolve(buildGame(1, 100));
    await flushResponses();

    expect(result.current.view.game?.id).toBe(2);
    expect($gameData.get()?.id).toBe(2);
  });

  it("clears a finished cached game before the first load answers", () => {
    setGameData({ ...buildGame(1), status: "finished" });
    getGameThrowsMock.mockReturnValue(new Promise(() => {}));
    renderHook(() => useGameSession(1), { wrapper: QueryClientWrapper });
    expect($gameData.get()).toBeNull();
  });
});
