// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameState } from "./useGameState";
import type { GameThrowsResponse } from "@/types";
import * as gameStore from "@/store";

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

  it("aborts old request on gameId change and ignores stale response", async () => {
    const firstRequest = createDeferred<GameThrowsResponse | null>();
    const secondRequest = createDeferred<GameThrowsResponse | null>();
    const calls: Array<{ gameId: number; signal?: AbortSignal }> = [];
    const setGameDataSpy = vi.spyOn(gameStore, "setGameData");

    getGameThrowsIfChangedMock.mockImplementation((gameId: number, signal?: AbortSignal) => {
      calls.push({ gameId, signal });

      if (gameId === 1) {
        return firstRequest.promise;
      }

      return secondRequest.promise;
    });

    const { result, rerender } = renderHook(
      ({ gameId }: { gameId: number | null }) => useGameState({ gameId }),
      { initialProps: { gameId: 1 } },
    );

    await waitFor(() => {
      expect(getGameThrowsIfChangedMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    });

    rerender({ gameId: 2 });

    await waitFor(() => {
      expect(getGameThrowsIfChangedMock).toHaveBeenCalledWith(2, expect.any(AbortSignal));
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

    expect(result.current.gameData?.id).toBe(2);
    expect(setGameDataSpy).not.toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});
