// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse } from "@/types";
import { ApiError } from "@/lib/api/errors";
import { $gameData, setGameData } from "@/stores";
import { recordThrow, undoLastThrow } from "../api";
import { isThrowNotAllowedConflict, useThrowHandler } from "./useThrowHandler";

vi.mock("../api", () => ({
  getGameThrows: vi.fn(),
  recordThrow: vi.fn(),
  resetGameStateVersion: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked($gameData.get).mockReturnValue(buildGameData());
  });

  it("prevents duplicate throws while request is in flight", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const deferred = createDeferred<GameThrowsResponse>();
    vi.mocked(recordThrow).mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    let firstPromise = Promise.resolve();
    let secondPromise = Promise.resolve();

    await act(async () => {
      firstPromise = result.current.handleThrow(20);
      secondPromise = result.current.handleThrow(20);
    });

    expect(vi.mocked(recordThrow)).toHaveBeenCalledTimes(1);
    expect(result.current.isActionInFlight).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith("Cannot throw: previous action is still processing");

    await act(async () => {
      deferred.resolve(buildGameData({ currentThrowCount: 1 }));
      await firstPromise;
      await secondPromise;
    });

    await waitFor(() => {
      expect(result.current.isActionInFlight).toBe(false);
    });

    warnSpy.mockRestore();
  });

  it("prevents duplicate undo while request is in flight", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const deferred = createDeferred<GameThrowsResponse>();
    vi.mocked(undoLastThrow).mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    let firstPromise = Promise.resolve();
    let secondPromise = Promise.resolve();

    await act(async () => {
      firstPromise = result.current.handleUndo();
      secondPromise = result.current.handleUndo();
    });

    expect(vi.mocked(undoLastThrow)).toHaveBeenCalledTimes(1);
    expect(result.current.isActionInFlight).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith("Cannot undo: previous action is still processing");

    await act(async () => {
      deferred.resolve(buildGameData({ currentThrowCount: 0 }));
      await firstPromise;
      await secondPromise;
    });

    await waitFor(() => {
      expect(result.current.isActionInFlight).toBe(false);
    });

    warnSpy.mockRestore();
  });

  it("stores updated state after successful throw", async () => {
    vi.mocked(recordThrow).mockResolvedValueOnce(buildGameData({ currentThrowCount: 1 }));
    const { result } = renderHook(() => useThrowHandler({ gameId: 1 }));

    await act(async () => {
      await result.current.handleThrow(20);
    });

    expect(vi.mocked(setGameData)).toHaveBeenCalledTimes(1);
  });
});
