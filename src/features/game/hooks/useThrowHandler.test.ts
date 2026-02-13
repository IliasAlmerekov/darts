// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse, ThrowAckResponse } from "@/types";
import { ApiError } from "@/lib/api/errors";
import { $gameData, setGameData } from "@/stores";
import {
  getGameThrows,
  recordThrow,
  resetGameStateVersion,
  setGameStateVersion,
  undoLastThrow,
} from "../api";
import { isThrowNotAllowedConflict, useThrowHandler } from "./useThrowHandler";

vi.mock("../api", () => ({
  getGameThrows: vi.fn(),
  recordThrow: vi.fn(),
  resetGameStateVersion: vi.fn(),
  setGameStateVersion: vi.fn(),
  undoLastThrow: vi.fn(),
}));

vi.mock("@/stores", () => ({
  $gameData: {
    get: vi.fn(),
  },
  setGameData: vi.fn(),
}));

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function buildGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
  return {
    id: 1,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    players: [
      {
        id: 1,
        name: "P1",
        score: 301,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
      {
        id: 2,
        name: "P2",
        score: 301,
        isActive: false,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
    ],
    ...overrides,
  };
}

function buildThrowAck(overrides: Partial<ThrowAckResponse> = {}): ThrowAckResponse {
  return {
    success: true,
    gameId: 1,
    stateVersion: "v1",
    throw: null,
    scoreboardDelta: {
      changedPlayers: [],
      winnerId: null,
      status: "started",
      currentRound: 1,
    },
    serverTs: new Date().toISOString(),
    ...overrides,
  };
}

describe("isThrowNotAllowedConflict", () => {
  it("returns true for 409 GAME_THROW_NOT_ALLOWED", () => {
    const error = new ApiError("Request failed", {
      status: 409,
      data: {
        error: "GAME_THROW_NOT_ALLOWED",
        message: "Throw is not allowed in current game state.",
      },
    });

    expect(isThrowNotAllowedConflict(error)).toBe(true);
  });

  it("returns false for other api error codes", () => {
    const error = new ApiError("Request failed", {
      status: 409,
      data: {
        error: "SOME_OTHER_ERROR",
      },
    });

    expect(isThrowNotAllowedConflict(error)).toBe(false);
  });

  it("returns false for non-ApiError values", () => {
    expect(isThrowNotAllowedConflict(new Error("boom"))).toBe(false);
  });
});

describe("useThrowHandler", () => {
  let currentGameState: GameThrowsResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    currentGameState = buildGameData();
    vi.mocked($gameData.get).mockImplementation(() => currentGameState);
    vi.mocked(setGameData).mockImplementation((nextState) => {
      currentGameState = nextState as GameThrowsResponse;
    });
  });

  it("keeps pending optimistic throws visible while previous server ack is applied", async () => {
    const firstDeferred = createDeferred<ThrowAckResponse>();
    const secondDeferred = createDeferred<ThrowAckResponse>();
    vi.mocked(recordThrow).mockReturnValueOnce(firstDeferred.promise);
    vi.mocked(recordThrow).mockReturnValueOnce(secondDeferred.promise);

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
    expect(result.current.pendingThrowCount).toBe(1);
    expect(result.current.isActionInFlight).toBe(false);
    expect(currentGameState.players[0]?.score).toBe(281);

    await act(async () => {
      await result.current.handleThrow(19);
    });

    expect(result.current.pendingThrowCount).toBe(2);
    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
    expect(currentGameState.players[0]?.score).toBe(262);
    expect(currentGameState.currentThrowCount).toBe(2);

    await act(async () => {
      firstDeferred.resolve(
        buildThrowAck({
          stateVersion: "v1",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 281,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 1,
          },
        }),
      );
      await firstDeferred.promise;
    });

    await waitFor(() => expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(currentGameState.currentThrowCount).toBe(2));
    expect(currentGameState.players[0]?.score).toBe(262);

    await act(async () => {
      secondDeferred.resolve(
        buildThrowAck({
          stateVersion: "v2",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 262,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 1,
          },
        }),
      );
      await secondDeferred.promise;
    });

    await waitFor(() => expect(result.current.pendingThrowCount).toBe(0));
    expect(currentGameState.players[0]?.score).toBe(262);
    expect(vi.mocked(setGameStateVersion)).toHaveBeenCalledWith(1, "v1");
    expect(vi.mocked(setGameStateVersion)).toHaveBeenCalledWith(1, "v2");
  });

  it("clears current throw display after 3rd throw when turn switches", async () => {
    vi.mocked(recordThrow)
      .mockResolvedValueOnce(
        buildThrowAck({
          stateVersion: "v1",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 281,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        buildThrowAck({
          stateVersion: "v2",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 261,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        buildThrowAck({
          stateVersion: "v3",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 241,
                position: null,
                isActive: false,
                isGuest: false,
                isBust: false,
              },
              {
                playerId: 2,
                name: "P2",
                score: 301,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 1,
          },
        }),
      );

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
      await result.current.handleThrow(20);
      await result.current.handleThrow(20);
    });

    await waitFor(() => expect(result.current.pendingThrowCount).toBe(0));

    const playerOne = currentGameState.players.find((player) => player.id === 1);
    const playerTwo = currentGameState.players.find((player) => player.id === 2);

    expect(currentGameState.activePlayerId).toBe(2);
    expect(currentGameState.currentThrowCount).toBe(0);
    expect(playerOne?.currentRoundThrows).toEqual([]);
    expect(playerOne?.throwsInCurrentRound).toBe(0);
    expect(playerOne?.roundHistory).toHaveLength(1);
    expect(playerTwo?.currentRoundThrows).toEqual([]);
    expect(playerTwo?.throwsInCurrentRound).toBe(0);
  });

  it("does not duplicate stale throws on bust after returning from summary undo", async () => {
    currentGameState = buildGameData({
      activePlayerId: 1,
      currentRound: 7,
      currentThrowCount: 0,
      players: [
        {
          id: 1,
          name: "P1",
          score: 1,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [
            { value: 25, isBust: false },
            { value: 25, isBust: false },
          ],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 50,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    vi.mocked(recordThrow).mockResolvedValueOnce(
      buildThrowAck({
        stateVersion: "v-bust",
        scoreboardDelta: {
          changedPlayers: [
            {
              playerId: 1,
              name: "P1",
              score: 26,
              position: null,
              isActive: false,
              isGuest: false,
              isBust: true,
            },
            {
              playerId: 2,
              name: "P2",
              score: 50,
              position: null,
              isActive: true,
              isGuest: false,
              isBust: false,
            },
          ],
          winnerId: null,
          status: "started",
          currentRound: 7,
        },
      }),
    );

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(25);
    });

    await waitFor(() => expect(result.current.pendingThrowCount).toBe(0));

    const playerOne = currentGameState.players.find((player) => player.id === 1);
    const playerTwo = currentGameState.players.find((player) => player.id === 2);
    const lastRound = playerOne?.roundHistory[playerOne.roundHistory.length - 1];

    expect(playerOne?.score).toBe(26);
    expect(playerOne?.currentRoundThrows).toEqual([]);
    expect(playerOne?.throwsInCurrentRound).toBe(0);
    expect(lastRound?.throws).toHaveLength(1);
    expect(lastRound?.round).toBe(7);
    expect(lastRound?.throws[0]).toEqual(
      expect.objectContaining({
        value: 25,
        isBust: true,
      }),
    );
    expect(playerTwo?.isActive).toBe(true);
  });

  it("caps throw queue to three pending throws", async () => {
    const deferred = createDeferred<ThrowAckResponse>();
    vi.mocked(recordThrow).mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
      await result.current.handleThrow(19);
      await result.current.handleThrow(18);
      await result.current.handleThrow(17);
    });

    expect(result.current.pendingThrowCount).toBe(3);
    expect(result.current.isQueueFull).toBe(true);
    expect(result.current.syncMessage).toBe(
      "Throw queue is full. Wait until current throws are synchronized.",
    );
    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
  });

  it("queues undo while pending throws are synchronizing", async () => {
    const deferred = createDeferred<ThrowAckResponse>();
    vi.mocked(recordThrow).mockReturnValueOnce(deferred.promise);
    vi.mocked(undoLastThrow).mockResolvedValueOnce(buildGameData());

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
      await result.current.handleUndo();
    });

    expect(vi.mocked(undoLastThrow)).not.toHaveBeenCalled();
    expect(result.current.syncMessage).toBe("Applying undo after current throw sync.");

    await act(async () => {
      deferred.resolve(buildThrowAck());
      await deferred.promise;
    });

    await waitFor(() => expect(vi.mocked(undoLastThrow)).toHaveBeenCalledWith(1));
  });

  it("reconciles state after throw conflict and clears pending queue", async () => {
    vi.mocked(recordThrow).mockRejectedValueOnce(
      new ApiError("Request failed", {
        status: 409,
        data: {
          error: "GAME_THROW_NOT_ALLOWED",
        },
      }),
    );
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameData({ currentRound: 2 }));

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    await waitFor(() => expect(vi.mocked(resetGameStateVersion)).toHaveBeenCalledWith(1));
    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));

    expect(result.current.pendingThrowCount).toBe(0);
    expect(result.current.syncMessage).toBe(
      "Game state changed in another session. Synced latest game state.",
    );
    expect(vi.mocked(setGameData)).toHaveBeenCalled();
  });

  it("applies optimistic undo immediately while waiting for server response", async () => {
    currentGameState = buildGameData({
      activePlayerId: 1,
      currentRound: 3,
      currentThrowCount: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 250,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 31, isDouble: false, isTriple: false, isBust: false },
          ],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    const pendingUndo = createDeferred<GameThrowsResponse>();
    vi.mocked(undoLastThrow).mockReturnValueOnce(pendingUndo.promise);

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      void result.current.handleUndo();
    });

    const activeAfterOptimisticUndo = currentGameState.players.find((player) => player.id === 1);
    expect(activeAfterOptimisticUndo?.score).toBe(281);
    expect(activeAfterOptimisticUndo?.throwsInCurrentRound).toBe(1);
    expect(activeAfterOptimisticUndo?.currentRoundThrows).toHaveLength(1);
    expect(activeAfterOptimisticUndo?.currentRoundThrows[0]).toEqual(
      expect.objectContaining({ value: 20, isBust: false }),
    );
    expect(currentGameState.currentThrowCount).toBe(1);

    await act(async () => {
      pendingUndo.resolve({
        ...currentGameState,
      });
      await pendingUndo.promise;
    });

    expect(vi.mocked(undoLastThrow)).toHaveBeenCalledWith(1);
  });
});
