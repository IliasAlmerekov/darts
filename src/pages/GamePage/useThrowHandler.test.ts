// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GameThrowsResponse,
  ScoreboardDelta,
  ThrowAckResponse,
  UndoAckResponse,
} from "@/types";
import { ApiError } from "@/shared/api";
import { $gameData, setGameData, setGameScoreboardDelta } from "@/shared/store";
import {
  getGameThrows,
  recordThrow,
  resetGameStateVersion,
  setGameStateVersion,
  undoLastThrow,
} from "@/shared/api/game";
import { isThrowNotAllowedConflict, useThrowHandler } from "./useThrowHandler";

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
  recordThrow: vi.fn(),
  resetGameStateVersion: vi.fn(),
  setGameStateVersion: vi.fn(),
  undoLastThrow: vi.fn(),
}));

vi.mock("@/shared/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    $gameData: {
      get: vi.fn(),
    },
    setGameData: vi.fn(),
    setGameScoreboardDelta: vi.fn(),
  };
});

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
    type: "full-state",
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

function buildUndoAck(overrides: Partial<UndoAckResponse> = {}): UndoAckResponse {
  return {
    type: "ack",
    success: true,
    gameId: 1,
    stateVersion: "undo-v1",
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

function applyScoreboardDelta(
  currentGameState: GameThrowsResponse,
  scoreboardDelta: ScoreboardDelta,
) {
  const changedPlayerById = new Map(
    scoreboardDelta.changedPlayers.map((playerDelta) => [playerDelta.playerId, playerDelta]),
  );
  const players = currentGameState.players.map((player) => {
    const playerDelta = changedPlayerById.get(player.id);
    if (!playerDelta) {
      return player;
    }

    return {
      ...player,
      score: playerDelta.score,
      position: playerDelta.position,
      isActive: playerDelta.isActive,
      isBust: typeof playerDelta.isBust === "boolean" ? playerDelta.isBust : player.isBust,
    };
  });
  const activePlayerId =
    scoreboardDelta.changedPlayers.find((playerDelta) => playerDelta.isActive)?.playerId ??
    currentGameState.activePlayerId;
  const activePlayer = players.find((player) => player.id === activePlayerId);

  return {
    ...currentGameState,
    players,
    activePlayerId,
    currentRound: scoreboardDelta.currentRound,
    status: scoreboardDelta.status,
    winnerId: scoreboardDelta.winnerId,
    currentThrowCount: activePlayer
      ? Math.max(activePlayer.currentRoundThrows.length, activePlayer.throwsInCurrentRound)
      : currentGameState.currentThrowCount,
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
    vi.mocked(setGameScoreboardDelta).mockImplementation((scoreboardDelta) => {
      currentGameState = applyScoreboardDelta(currentGameState, scoreboardDelta as ScoreboardDelta);
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
    expect(result.current).not.toHaveProperty("isActionInFlight");
    expect(result.current).not.toHaveProperty("isUndoInFlight");
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

  it("refetches full game state when the final ack rolls turn ownership back", async () => {
    currentGameState = buildGameData({
      activePlayerId: 1,
      currentRound: 4,
      currentThrowCount: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 262,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: false, isBust: false },
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

    vi.mocked(recordThrow).mockResolvedValueOnce(
      buildThrowAck({
        stateVersion: "v-stale-final",
        scoreboardDelta: {
          changedPlayers: [
            {
              playerId: 1,
              name: "P1",
              score: 242,
              position: null,
              isActive: true,
              isGuest: false,
              isBust: false,
            },
            {
              playerId: 2,
              name: "P2",
              score: 301,
              position: null,
              isActive: false,
              isGuest: false,
              isBust: false,
            },
          ],
          winnerId: null,
          status: "started",
          currentRound: 4,
        },
      }),
    );
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameData({
        activePlayerId: 2,
        currentRound: 4,
        currentThrowCount: 0,
        players: [
          {
            id: 1,
            name: "P1",
            score: 242,
            isActive: false,
            isBust: false,
            position: null,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [
              {
                round: 4,
                throws: [
                  { value: 20, isDouble: false, isTriple: false, isBust: false },
                  { value: 19, isDouble: false, isTriple: false, isBust: false },
                  { value: 20, isDouble: false, isTriple: false, isBust: false },
                ],
              },
            ],
          },
          {
            id: 2,
            name: "P2",
            score: 301,
            isActive: true,
            isBust: false,
            position: null,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
            roundHistory: [],
          },
        ],
      }),
    );

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));
    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setGameStateVersion)).toHaveBeenCalledWith(1, "v-stale-final");
    expect(result.current.pendingThrowCount).toBe(0);
    expect(result.current.syncMessage).toBe(
      "Received inconsistent turn update from server. Refreshed latest game state.",
    );
    expect(currentGameState.activePlayerId).toBe(2);
    expect(currentGameState.currentThrowCount).toBe(0);
    expect(currentGameState.players[0]?.currentRoundThrows).toEqual([]);
    expect(currentGameState.players[1]?.isActive).toBe(true);
  });

  it("clears queued throws when server ack keeps the same player active", async () => {
    currentGameState = buildGameData({
      activePlayerId: 1,
      currentRound: 4,
      currentThrowCount: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 262,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 19, isDouble: false, isTriple: false, isBust: false },
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

    const firstDeferred = createDeferred<ThrowAckResponse>();
    vi.mocked(recordThrow).mockReturnValueOnce(firstDeferred.promise);
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameData({
        activePlayerId: 1,
        currentRound: 4,
        currentThrowCount: 1,
        players: [
          {
            id: 1,
            name: "P1",
            score: 242,
            isActive: true,
            isBust: false,
            position: null,
            throwsInCurrentRound: 1,
            currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
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
      }),
    );

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    expect(currentGameState.activePlayerId).toBe(2);
    expect(result.current.pendingThrowCount).toBe(1);

    await act(async () => {
      await result.current.handleThrow(19);
    });

    expect(result.current.pendingThrowCount).toBe(2);
    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstDeferred.resolve(
        buildThrowAck({
          stateVersion: "v-stale-1",
          scoreboardDelta: {
            changedPlayers: [
              {
                playerId: 1,
                name: "P1",
                score: 242,
                position: null,
                isActive: true,
                isGuest: false,
                isBust: false,
              },
              {
                playerId: 2,
                name: "P2",
                score: 301,
                position: null,
                isActive: false,
                isGuest: false,
                isBust: false,
              },
            ],
            winnerId: null,
            status: "started",
            currentRound: 4,
          },
        }),
      );
      await firstDeferred.promise;
    });

    await waitFor(() => expect(result.current.pendingThrowCount).toBe(0));
    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));
    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
    expect(result.current.syncMessage).toBe(
      "Game state changed while throws were syncing. Cleared queued throws and synced latest turn.",
    );
    expect(currentGameState.activePlayerId).toBe(1);
    expect(currentGameState.players[1]?.score).toBe(301);
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

  it("reconciles game state when the local active player is missing before a throw", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    currentGameState = buildGameData({
      activePlayerId: null,
      players: [
        {
          id: 1,
          name: "P1",
          score: 281,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
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
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameData());

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));
    expect(vi.mocked(recordThrow)).not.toHaveBeenCalled();
    expect(result.current.syncMessage).toBe(
      "Game state was out of sync. Refreshed latest game state.",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[client:error] game.throw.missing-active-player",
      {
        context: {
          activePlayerId: null,
          gameId: 1,
          playerCount: 2,
        },
      },
    );
    consoleErrorSpy.mockRestore();
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

  it("applies compact undo acknowledgement through targeted scoreboard updates", async () => {
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
    vi.mocked(undoLastThrow).mockResolvedValueOnce(
      buildUndoAck({
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
          currentRound: 3,
        },
      }),
    );

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(vi.mocked(setGameScoreboardDelta)).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRound: 3,
        status: "started",
      }),
      1,
    );
    expect(vi.mocked(getGameThrows)).not.toHaveBeenCalled();
    expect(currentGameState.players[0]?.score).toBe(281);
    expect(currentGameState.currentThrowCount).toBe(1);
  });

  it("should return isUndoPending: false initially", () => {
    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));
    expect(result.current.isUndoPending).toBe(false);
  });

  it("should set isUndoPending: true while undo is in-flight", async () => {
    const pendingUndo = createDeferred<GameThrowsResponse>();
    vi.mocked(undoLastThrow).mockReturnValueOnce(pendingUndo.promise);

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    act(() => {
      void result.current.handleUndo();
    });

    await waitFor(() => expect(result.current.isUndoPending).toBe(true));

    await act(async () => {
      pendingUndo.resolve(buildGameData());
      await pendingUndo.promise;
    });

    await waitFor(() => expect(result.current.isUndoPending).toBe(false));
  });

  it("should set isUndoPending: false after undo completes", async () => {
    vi.mocked(undoLastThrow).mockResolvedValueOnce(buildGameData());

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(result.current.isUndoPending).toBe(false);
  });

  it("should set isUndoPending: false after undo API failure", async () => {
    vi.mocked(undoLastThrow).mockRejectedValueOnce(new Error("network error"));
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameData());

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    await waitFor(() => expect(result.current.isUndoPending).toBe(false));
  });

  it("should call reconcileGameState when server returns null activePlayerId", async () => {
    const invalidResponse = buildGameData({
      activePlayerId: null as unknown as number,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: false,
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
    });
    vi.mocked(undoLastThrow).mockResolvedValueOnce(invalidResponse);
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameData());

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));
    expect(vi.mocked(setGameData)).not.toHaveBeenCalledWith(invalidResponse);
  });

  it("accepts undo response with null activePlayerId when a single active player can be derived", async () => {
    const undoResponse = buildGameData({
      activePlayerId: null as unknown as number,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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
    vi.mocked(undoLastThrow).mockResolvedValueOnce(undoResponse);

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 259,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 21, isDouble: false, isTriple: false, isBust: false },
            { value: 21, isDouble: false, isTriple: false, isBust: false },
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(vi.mocked(getGameThrows)).not.toHaveBeenCalled();
    expect(currentGameState.activePlayerId).toBe(1);
    expect(currentGameState.players[0]?.isActive).toBe(true);
  });

  it("should call reconcileGameState when undo API throws", async () => {
    vi.mocked(undoLastThrow).mockRejectedValueOnce(new Error("server error"));
    vi.mocked(getGameThrows).mockResolvedValueOnce(buildGameData());

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleUndo();
    });

    await waitFor(() => expect(vi.mocked(getGameThrows)).toHaveBeenCalledWith(1));
  });

  it("should not call undoLastThrow twice on rapid undo clicks", async () => {
    const pendingUndo = createDeferred<GameThrowsResponse>();
    vi.mocked(undoLastThrow).mockReturnValueOnce(pendingUndo.promise);

    currentGameState = buildGameData({
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    act(() => {
      void result.current.handleUndo();
      void result.current.handleUndo();
    });

    await act(async () => {
      pendingUndo.resolve(buildGameData());
      await pendingUndo.promise;
    });

    expect(vi.mocked(undoLastThrow)).toHaveBeenCalledTimes(1);
  });
});
