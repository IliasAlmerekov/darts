// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameState } from "./useGameState";
import type { GameThrowsResponse } from "@/types";
import * as gameStore from "@/shared/store";

const getGameThrowsIfChangedMock = vi.fn();
const resetGameStateVersionMock = vi.fn();

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function createGameData(gameId: number): GameThrowsResponse {
  return {
    type: "full-state",
    id: gameId,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    players: [],
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

vi.mock("@/shared/api/game", () => ({
  getGameThrowsIfChanged: (...args: unknown[]) => getGameThrowsIfChangedMock(...args),
  resetGameStateVersion: (...args: unknown[]) => resetGameStateVersionMock(...args),
}));

describe("useGameState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameStore.resetGameStore();
  });

  it("resets the shared store on gameId change and ignores stale response", async () => {
    const firstRequest = createDeferred<GameThrowsResponse | null>();
    const secondRequest = createDeferred<GameThrowsResponse | null>();
    const calls: Array<{ gameId: number; signal?: AbortSignal | undefined }> = [];

    getGameThrowsIfChangedMock.mockImplementation((gameId: number, signal?: AbortSignal) => {
      calls.push({ gameId, signal });

      if (gameId === 1) {
        return firstRequest.promise;
      }

      return secondRequest.promise;
    });

    gameStore.setGameData(createGameData(1));
    const setGameDataSpy = vi.spyOn(gameStore, "setGameData");
    const initialProps: { gameId: number | null } = { gameId: 1 };

    const { result, rerender } = renderHook(
      ({ gameId }: { gameId: number | null }) => useGameState({ gameId }),
      { initialProps },
    );

    expect(result.current.gameData?.id).toBe(1);

    rerender({ gameId: 2 });

    await waitFor(() => {
      expect(getGameThrowsIfChangedMock).toHaveBeenCalledWith(2, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(result.current.gameData).toBeNull();
    });

    expect(calls[0]?.signal?.aborted).toBe(true);
    expect(calls[1]?.signal?.aborted).toBe(false);

    secondRequest.resolve(createGameData(2));
    await waitFor(() => {
      expect(result.current.gameData?.id).toBe(2);
    });

    firstRequest.resolve(createGameData(1));
    await Promise.resolve();
    await Promise.resolve();

    const staleWriteCalls = setGameDataSpy.mock.calls.filter(
      ([data]) => (data as GameThrowsResponse | null)?.id === 1,
    );

    expect(result.current.gameData?.id).toBe(2);
    expect(staleWriteCalls).toHaveLength(0);
  });

  it("invalidates in-flight manual refetch when gameId is cleared", async () => {
    const manualRefetch = createDeferred<GameThrowsResponse | null>();
    const setGameDataSpy = vi.spyOn(gameStore, "setGameData");

    getGameThrowsIfChangedMock
      .mockResolvedValueOnce(createGameData(1))
      .mockImplementationOnce(() => manualRefetch.promise);
    const initialProps: { gameId: number | null } = { gameId: 1 };

    const { result, rerender } = renderHook(
      ({ gameId }: { gameId: number | null }) => useGameState({ gameId }),
      { initialProps },
    );

    await waitFor(() => {
      expect(result.current.gameData?.id).toBe(1);
    });

    act(() => {
      void result.current.refetch();
    });

    await waitFor(() => {
      expect(getGameThrowsIfChangedMock).toHaveBeenCalledTimes(2);
    });

    rerender({ gameId: null });

    await waitFor(() => {
      expect(result.current.gameData).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    const setGameDataCallCountBeforeResolve = setGameDataSpy.mock.calls.length;

    manualRefetch.resolve(createGameData(1));
    await Promise.resolve();
    await Promise.resolve();

    expect(result.current.gameData).toBeNull();
    expect(setGameDataSpy).toHaveBeenCalledTimes(setGameDataCallCountBeforeResolve);
  });

  it("keeps refetch stable between rerenders for the same game", async () => {
    getGameThrowsIfChangedMock.mockResolvedValue(createGameData(1));

    const { result, rerender } = renderHook(
      ({ gameId }: { gameId: number | null }) => useGameState({ gameId }),
      { initialProps: { gameId: 1 } },
    );

    await waitFor(() => {
      expect(result.current.gameData?.id).toBe(1);
    });

    const initialRefetch = result.current.refetch;

    rerender({ gameId: 1 });

    expect(result.current.refetch).toBe(initialRefetch);
  });
});
