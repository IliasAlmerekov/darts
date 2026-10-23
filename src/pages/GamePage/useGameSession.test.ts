// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
  getGameThrowsIfChanged: vi.fn(),
  recordThrow: vi.fn(),
  resetGameStateVersion: vi.fn(),
  setGameStateVersion: vi.fn(),
  undoLastThrow: vi.fn(),
}));

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGameThrows,
  getGameThrowsIfChanged,
  recordThrow,
  setGameStateVersion,
  type ThrowAckResponse,
} from "@/shared/api/game";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { $gameData, resetGameStore, setGameData } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type { GameThrowsResponse } from "@/types";
import { useGameSession } from "./useGameSession";

const getGameThrowsIfChangedMock = vi.mocked(getGameThrowsIfChanged);
const getGameThrowsMock = vi.mocked(getGameThrows);
const recordThrowMock = vi.mocked(recordThrow);

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

  it("aborts the load of the previous game and ignores its late answer", async () => {
    const firstLoad = createDeferred<GameThrowsResponse | null>();
    const secondLoad = createDeferred<GameThrowsResponse | null>();
    getGameThrowsIfChangedMock.mockImplementation((gameId) =>
      gameId === 1 ? firstLoad.promise : secondLoad.promise,
    );
    setGameData(buildGame(1));

    const { result, rerender } = renderHook(({ gameId }) => useGameSession(gameId), {
      initialProps: { gameId: 1 as number | null },
    });
    expect(result.current.view.game?.id).toBe(1);

    rerender({ gameId: 2 });
    await waitFor(() => {
      expect(result.current.view.game).toBeNull();
    });
    const firstSignal = getGameThrowsIfChangedMock.mock.calls[0]?.[1];
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

  it("ignores a throw acknowledgement that arrives after the page left the game (#95)", async () => {
    const ack = createDeferred<ThrowAckResponse>();
    recordThrowMock.mockReturnValueOnce(ack.promise);
    getGameThrowsIfChangedMock.mockImplementation((gameId) => Promise.resolve(buildGame(gameId)));

    const { result, rerender } = renderHook(({ gameId }) => useGameSession(gameId), {
      initialProps: { gameId: 1 },
    });
    await waitFor(() => {
      expect(result.current.view.canThrow).toBe(true);
    });

    act(() => {
      result.current.commands.throwDart(20);
    });
    expect(result.current.view.game?.players[0]?.score).toBe(281);

    rerender({ gameId: 2 });
    await waitFor(() => {
      expect(result.current.view.game?.id).toBe(2);
    });

    ack.resolve(buildThrowAck(1));
    await flushResponses();

    expect(result.current.view.game?.id).toBe(2);
    expect(result.current.view.game?.players[0]?.score).toBe(301);
    expect(result.current.view.status).toBe("idle");
    expect(setGameStateVersion).not.toHaveBeenCalled();
  });

  it("reloads the game when the shown game has no active player to throw for", async () => {
    const game = buildGame(1);
    getGameThrowsIfChangedMock.mockResolvedValueOnce({
      ...game,
      activePlayerId: null,
      players: game.players.map((player) => ({ ...player, isActive: false })),
    });
    getGameThrowsMock.mockResolvedValueOnce(buildGame(1, 281));

    const { result } = renderHook(() => useGameSession(1));
    await waitFor(() => {
      expect(result.current.view.canThrow).toBe(true);
    });

    act(() => {
      result.current.commands.throwDart(20);
    });

    await waitFor(() => {
      expect(result.current.view.status).toBe("failed");
    });
    expect(getGameThrowsMock).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(recordThrowMock).not.toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith("error");
    expect(result.current.view.game?.activePlayerId).toBe(1);
    expect(result.current.view.game?.players[0]?.score).toBe(281);
    expect(result.current.view.canThrow).toBe(true);
  });

  it("drops a reload in flight when the game id is cleared", async () => {
    const reload = createDeferred<GameThrowsResponse | null>();
    getGameThrowsIfChangedMock
      .mockResolvedValueOnce(buildGame(1))
      .mockImplementationOnce(() => reload.promise);

    const { result, rerender } = renderHook(({ gameId }) => useGameSession(gameId), {
      initialProps: { gameId: 1 as number | null },
    });
    await waitFor(() => {
      expect(result.current.view.game?.id).toBe(1);
    });

    act(() => {
      result.current.commands.retry();
    });
    expect(getGameThrowsIfChangedMock).toHaveBeenCalledTimes(2);

    rerender({ gameId: null });
    await waitFor(() => {
      expect(result.current.view.game).toBeNull();
    });

    reload.resolve(buildGame(1, 100));
    await flushResponses();

    expect(result.current.view.game).toBeNull();
    expect(result.current.view.isLoading).toBe(false);
    expect(result.current.view.error).toBeNull();
  });
});
