// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeLoaderArgs } from "@/test/loaderArgs";
import type { ReactNode } from "react";
import { createElement } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createQueryClient, queryClient as appQueryClient } from "@/shared/query/queryClient";
import { gameQueries } from "@/shared/query/game.queries";
import { ApiError } from "@/shared/api";
import { gameSummaryLoader, useGameSummaryPage } from "./useGameSummaryPage";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { $gameData, resetGameStore, setGameData } from "@/shared/store";
import type { GameThrowsResponse, UndoAckResponse } from "@/types";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
  buildGameSettingsResponse,
} from "@/shared/types/game.test-support";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const getGameSettingsMock = vi.fn();
const createRematchGameMock = vi.fn();
const startRematchMock = vi.fn();
const undoLastThrowMock = vi.fn();
const getTabletGameMock = vi.fn();
const setCurrentGameIdMock = vi.fn();
const setInvitationMock = vi.fn();
const resetRoomStoreMock = vi.fn();

// Mutable state for router — allows per-test overrides without vi.doMock
let routeParams: { id?: string | undefined } = { id: "42" };
let testQueryClient: QueryClient;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => routeParams,
}));

vi.mock("@nanostores/react", () => ({
  useStore: (store: { get: () => unknown }) => store.get(),
}));

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
  getGameSettings: (...args: unknown[]) => getGameSettingsMock(...args),
  createRematchGame: (...args: unknown[]) => createRematchGameMock(...args),
  startRematch: (...args: unknown[]) => startRematchMock(...args),
  undoLastThrow: (...args: unknown[]) => undoLastThrowMock(...args),
  getTabletGame: (...args: unknown[]) => getTabletGameMock(...args),
}));

vi.mock("@/shared/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
    setInvitation: (...args: unknown[]) => setInvitationMock(...args),
    resetRoomStore: (...args: unknown[]) => resetRoomStoreMock(...args),
  };
});

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
}));

const SETTINGS_RESPONSE = buildGameSettingsResponse({
  gameId: 42,
  status: "finished",
  startScore: 301,
});

function buildFinishedGameState(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 42,
    status: "finished",
    currentRound: 7,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: 1,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      {
        id: 1,
        name: "Alice",
        score: 0,
        isActive: true,
        isBust: false,
        position: 1,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [
          {
            round: 7,
            throws: [
              { value: 20, isDouble: false, isTriple: false, isBust: false },
              { value: 20, isDouble: false, isTriple: false, isBust: false },
              { value: 20, isDouble: false, isTriple: false, isBust: false },
            ],
          },
        ],
        isGuest: false,
      },
      {
        id: 2,
        name: "Bob",
        score: 40,
        isActive: false,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
        isGuest: false,
      },
    ],
  };
}

function buildStartedGameState(): GameThrowsResponse {
  const finishedGameState = buildFinishedGameState();
  const firstPlayer = finishedGameState.players[0];
  const secondPlayer = finishedGameState.players[1];
  if (!firstPlayer || !secondPlayer) {
    throw new Error("Fixture error: expected two players in finished game state");
  }

  return {
    ...finishedGameState,
    status: "started",
    currentRound: 7,
    currentThrowCount: 2,
    winnerId: null,
    players: [
      {
        ...firstPlayer,
        score: 20,
        isActive: true,
        position: null,
        throwsInCurrentRound: 2,
        currentRoundThrows: [
          { value: 20, isDouble: false, isTriple: false, isBust: false },
          { value: 20, isDouble: false, isTriple: false, isBust: false },
        ],
        roundHistory: [],
      },
      {
        ...secondPlayer,
      },
    ],
  };
}

function buildUndoAck(overrides: Partial<UndoAckResponse> = {}): UndoAckResponse {
  return {
    type: "ack",
    success: true,
    gameId: 42,
    stateVersion: "undo-v1",
    scoreboardDelta: {
      changedPlayers: [],
      winnerId: null,
      status: "started",
      currentRound: 7,
    },
    serverTs: "2026-03-10T10:00:00.000Z",
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client: testQueryClient }, children);
}

type SummaryHook = ReturnType<typeof useGameSummaryPage>;

const SUMMARY_ACTIONS = [
  {
    action: "Undo",
    run: (hook: SummaryHook) => hook.handleUndo(),
    request: undoLastThrowMock,
    response: (): unknown => buildUndoAck(),
  },
  {
    action: "Play Again",
    run: (hook: SummaryHook) => hook.handlePlayAgain(),
    request: startRematchMock,
    response: (): unknown => ({ success: true, gameId: 77, invitationLink: "/invite/77" }),
  },
  {
    action: "Back To Start",
    run: (hook: SummaryHook) => hook.handleBackToStart(),
    request: createRematchGameMock,
    response: (): unknown => ({ success: true, gameId: 77 }),
  },
];

const ORDERED_ACTION_PAIRS = SUMMARY_ACTIONS.flatMap((first) =>
  SUMMARY_ACTIONS.map((second) => ({ first, second })),
);

function countSummaryRequests(): number {
  return SUMMARY_ACTIONS.reduce((count, { request }) => count + request.mock.calls.length, 0);
}

function renderSummaryHook() {
  return renderHook(() => useGameSummaryPage(), { wrapper });
}

function finishedPlayer(playerId: number, username: string) {
  return { playerId, username, position: 1, roundsPlayed: 5, roundAverage: 60.2 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameStore();
    setCurrentGameIdMock.mockReset();
    setInvitationMock.mockReset();
    resetRoomStoreMock.mockReset();

    // Reset mutable router/store state to defaults before each test
    routeParams = { id: "42" };
    testQueryClient = createQueryClient();
    getGameSettingsMock.mockResolvedValue(SETTINGS_RESPONSE);
    getTabletGameMock.mockResolvedValue({ game: null, lastFinishedGameId: 42 });

    getFinishedGameMock.mockResolvedValue([]);
    startRematchMock.mockResolvedValue({
      success: true,
      gameId: 77,
      settings: {
        startScore: 301,
        doubleOut: false,
        tripleOut: false,
      },
      invitationLink: "/invite/77",
    });
    createRematchGameMock.mockResolvedValue({
      success: true,
      gameId: 77,
    });
    undoLastThrowMock.mockResolvedValue(buildUndoAck());
  });

  // #123: the game page owns the game state, so it reads the reopened game from the server.
  it.each([
    { response: "compact ack", undoResponse: () => buildUndoAck() },
    { response: "full game", undoResponse: () => buildStartedGameState() },
  ])(
    "should undo on the server and open the game without writing the game store ($response)",
    async ({ undoResponse }) => {
      undoLastThrowMock.mockResolvedValueOnce(undoResponse());
      setGameData(buildFinishedGameState());
      const shownGame = $gameData.get();

      const { result } = renderSummaryHook();

      await act(async () => {
        await result.current.handleUndo();
      });

      expect(undoLastThrowMock).toHaveBeenCalledWith(42);
      expect($gameData.get()).toBe(shownGame);
      expect(playSound).toHaveBeenCalledWith("undo");
      expect(navigateMock).toHaveBeenCalledWith("/game/42", {
        state: { skipFinishOverlay: true },
      });
    },
  );

  it("should not navigate when undo request fails", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
  });

  // #100
  it("should run no other summary action while Undo is pending, even in the same tick", async () => {
    undoLastThrowMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderSummaryHook();

    await act(async () => {
      void result.current.handleUndo();
      void result.current.handleUndo();
      void result.current.handlePlayAgain();
      void result.current.handleBackToStart();
    });

    expect(undoLastThrowMock).toHaveBeenCalledTimes(1);
    expect(startRematchMock).not.toHaveBeenCalled();
    expect(createRematchGameMock).not.toHaveBeenCalled();
    expect(result.current.isActionPending).toBe(true);
  });

  // #100: every pair of competing taps, the second while the first request still waits.
  it.each(ORDERED_ACTION_PAIRS)(
    "should send one request and navigate once for $first.action then $second.action",
    async ({ first, second }) => {
      const firstResponse = deferred<unknown>();
      first.request.mockReturnValueOnce(firstResponse.promise);
      const { result } = renderSummaryHook();

      let firstRun: Promise<void> = Promise.resolve();
      await act(async () => {
        firstRun = first.run(result.current);
      });
      await act(async () => {
        await second.run(result.current);
      });
      await act(async () => {
        firstResponse.resolve(first.response());
        await firstRun;
      });

      expect(first.request).toHaveBeenCalledTimes(1);
      expect(countSummaryRequests()).toBe(1);
      expect(navigateMock).toHaveBeenCalledTimes(1);
    },
  );

  it("should allow another summary action once Undo has failed", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });
    expect(result.current.isActionPending).toBe(false);

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(createRematchGameMock).toHaveBeenCalledWith(42);
  });

  it("should navigate to game route when startRematch resolves successfully", async () => {
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(startRematchMock).toHaveBeenCalledWith(42);
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  it("should not overwrite shared game state when starting a rematch", async () => {
    setGameData(buildFinishedGameState());
    const shownGame = $gameData.get();
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect($gameData.get()).toBe(shownGame);
    expect(setInvitationMock).toHaveBeenCalledWith({
      gameId: 77,
      invitationLink: "/invite/77",
    });
  });

  it("should not navigate when startRematch fails", async () => {
    startRematchMock.mockRejectedValueOnce(new Error("server error"));

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(startRematchMock).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it("should prevent concurrent handlePlayAgain calls when rematch start is already pending", async () => {
    let resolveStartRematch:
      | ((value: {
          success: boolean;
          gameId: number;
          settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
          invitationLink?: string;
        }) => void)
      | null = null;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderSummaryHook();

    let firstCall: Promise<void> | null = null;
    await act(async () => {
      firstCall = result.current.handlePlayAgain();
    });

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    await act(async () => {
      if (resolveStartRematch === null || firstCall === null) {
        throw new Error("Fixture error: rematch promise was not initialized");
      }
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await firstCall;
    });

    expect(startRematchMock).toHaveBeenCalledTimes(1);
  });

  it("should call navigate only after startRematch resolves when rematch start is pending", async () => {
    let resolveStartRematch:
      | ((value: {
          success: boolean;
          gameId: number;
          settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
          invitationLink?: string;
        }) => void)
      | null = null;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderSummaryHook();

    let callPromise: Promise<void> | null = null;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      if (resolveStartRematch === null || callPromise === null) {
        throw new Error("Fixture error: rematch promise was not initialized");
      }
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await callPromise;
    });

    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  // #100: the next route's loader runs after the navigation, and the summary stays on screen
  // until it ends, so a tap in that window must not start a second mutation.
  it.each(SUMMARY_ACTIONS)(
    "should run no other summary action after $action has succeeded",
    async ({ run }) => {
      const { result } = renderSummaryHook();

      await act(async () => {
        await run(result.current);
      });
      for (const other of SUMMARY_ACTIONS) {
        await act(async () => {
          await other.run(result.current);
        });
      }

      expect(countSummaryRequests()).toBe(1);
      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(result.current.isActionPending).toBe(true);
    },
  );

  it("should keep isActionPending true while startRematch runs and after it succeeds", async () => {
    let resolveStartRematch:
      | ((value: {
          success: boolean;
          gameId: number;
          settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
          invitationLink?: string;
        }) => void)
      | null = null;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderSummaryHook();

    let callPromise: Promise<void> | null = null;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(result.current.isActionPending).toBe(true);

    await act(async () => {
      if (resolveStartRematch === null || callPromise === null) {
        throw new Error("Fixture error: rematch promise was not initialized");
      }
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await callPromise;
    });

    expect(result.current.isActionPending).toBe(true);
  });

  it("should not navigate when rematch response misses game id", async () => {
    startRematchMock.mockResolvedValueOnce({
      success: false,
      gameId: 0,
      settings: {
        startScore: 301,
        doubleOut: false,
        tripleOut: false,
      },
    });

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalledWith("/start/77");
  });

  it("should not overwrite shared game state when returning to start from summary", async () => {
    setGameData(buildFinishedGameState());
    const shownGame = $gameData.get();
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(resetRoomStoreMock).toHaveBeenCalledTimes(1);
    expect($gameData.get()).toBe(shownGame);
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    expect(setInvitationMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/start/77");
  });

  it("should keep the room store when the rematch is rejected because the game is not the newest", async () => {
    createRematchGameMock.mockRejectedValueOnce(
      new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } }),
    );
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(resetRoomStoreMock).not.toHaveBeenCalled();
    expect(setCurrentGameIdMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });

  it("should keep action handlers referentially stable when dependencies do not change", async () => {
    const { result } = renderSummaryHook();
    const initialHandleUndo = result.current.handleUndo;
    const initialHandlePlayAgain = result.current.handlePlayAgain;
    const initialHandleBackToStart = result.current.handleBackToStart;

    await waitFor(() => {
      expect(getFinishedGameMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    });

    expect(result.current.handleUndo).toBe(initialHandleUndo);
    expect(result.current.handlePlayAgain).toBe(initialHandlePlayAgain);
    expect(result.current.handleBackToStart).toBe(initialHandleBackToStart);
  });

  it("should fetch the summary through the finishedGame query", async () => {
    getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);

    const { result } = renderSummaryHook();

    await waitFor(() => {
      expect(result.current.standings).toEqual([
        expect.objectContaining({ id: 3, name: "Carol", scoreAverage: 60.2, roundCount: 5 }),
      ]);
    });
    expect(getFinishedGameMock).toHaveBeenCalledWith(42, expect.any(AbortSignal));
    expect(testQueryClient.getQueryData(["finishedGame", 42])).toEqual([
      finishedPlayer(3, "Carol"),
    ]);
  });

  it("should read the summary seeded by the game page without waiting for the network", () => {
    testQueryClient.setQueryData(["finishedGame", 42], [finishedPlayer(2, "Bob")]);

    const { result } = renderSummaryHook();

    expect(result.current.standings).toEqual([expect.objectContaining({ id: 2, name: "Bob" })]);
    expect(getFinishedGameMock).not.toHaveBeenCalled();
  });

  it("should show game B when game A's response arrives after B's", async () => {
    const gameA = deferred<ReturnType<typeof finishedPlayer>[]>();
    const gameB = deferred<ReturnType<typeof finishedPlayer>[]>();
    getFinishedGameMock.mockImplementation((id: number) =>
      id === 1 ? gameA.promise : gameB.promise,
    );
    routeParams = { id: "1" };
    const { result, rerender } = renderSummaryHook();

    routeParams = { id: "2" };
    rerender();
    await act(async () => {
      gameB.resolve([finishedPlayer(20, "Beta")]);
      await gameB.promise;
    });
    await act(async () => {
      gameA.resolve([finishedPlayer(10, "Alpha")]);
      await gameA.promise;
    });

    await waitFor(() => {
      expect(result.current.standings.map((player) => player.name)).toEqual(["Beta"]);
    });
  });

  it("should not show game A's standings while game B loads", async () => {
    getFinishedGameMock.mockImplementation((id: number) =>
      id === 1 ? Promise.resolve([finishedPlayer(10, "Alpha")]) : new Promise(() => {}),
    );
    routeParams = { id: "1" };
    const { result, rerender } = renderSummaryHook();
    await waitFor(() => {
      expect(result.current.standings.map((player) => player.name)).toEqual(["Alpha"]);
    });

    routeParams = { id: "2" };
    rerender();

    expect(result.current.standings).toEqual([]);
  });

  it("should drop an action error from game A when the route moves to game B", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("boom"));
    routeParams = { id: "1" };
    const { result, rerender } = renderSummaryHook();
    await act(async () => {
      await result.current.handleUndo();
    });
    expect(result.current.error).not.toBeNull();

    routeParams = { id: "2" };
    rerender();

    expect(result.current.error).toBeNull();
  });

  it("should remove the finishedGame entry when undo succeeds", async () => {
    testQueryClient.setQueryData(["finishedGame", 42], [finishedPlayer(1, "Alice")]);
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(testQueryClient.getQueryData(["finishedGame", 42])).toBeUndefined();
  });

  it("should keep the finishedGame entry when undo fails", async () => {
    testQueryClient.setQueryData(["finishedGame", 42], [finishedPlayer(1, "Alice")]);
    undoLastThrowMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(testQueryClient.getQueryData(["finishedGame", 42])).toBeDefined();
  });

  it("should remove the finishedGame entry when a rematch starts", async () => {
    testQueryClient.setQueryData(["finishedGame", 42], [finishedPlayer(1, "Alice")]);
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(testQueryClient.getQueryData(["finishedGame", 42])).toBeUndefined();
  });

  it("should remove the finishedGame entry when returning to start", async () => {
    testQueryClient.setQueryData(["finishedGame", 42], [finishedPlayer(1, "Alice")]);
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(testQueryClient.getQueryData(["finishedGame", 42])).toBeUndefined();
  });

  it.each(SUMMARY_ACTIONS)(
    "should make routes read the tablet game again after $action succeeds",
    async ({ run }) => {
      testQueryClient.setQueryData(gameQueries.tablet().queryKey, {
        game: null,
        lastFinishedGameId: 42,
      });
      const { result } = renderSummaryHook();

      await act(async () => {
        await run(result.current);
      });

      expect(navigateMock).toHaveBeenCalled();
      expect(testQueryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(
        true,
      );
    },
  );

  describe("when the game is no longer the newest game", () => {
    const notNewest = (): ApiError =>
      new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } });

    beforeEach(() => {
      vi.useFakeTimers();
      testQueryClient.setQueryData(gameQueries.tablet().queryKey, {
        game: { id: 57, status: "started" },
        lastFinishedGameId: 56,
      });
      undoLastThrowMock.mockRejectedValue(notNewest());
      startRematchMock.mockRejectedValue(notNewest());
      createRematchGameMock.mockRejectedValue(notNewest());
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each(SUMMARY_ACTIONS)(
      "should show that the game is locked, then move to the tablet game on $action",
      async ({ run }) => {
        const { result } = renderSummaryHook();

        await act(async () => {
          await run(result.current);
        });

        expect(result.current.error).toBe("This game can no longer be changed.");
        expect(result.current.leaving).toBe(true);
        // The page disables its actions through this lock alone while it moves away.
        expect(result.current.isActionPending).toBe(true);
        expect(navigateMock).not.toHaveBeenCalled();

        act(() => {
          vi.advanceTimersByTime(2_000);
        });

        expect(navigateMock).toHaveBeenCalledWith("/game/57", { replace: true });
      },
    );

    // The server refuses every change to this game, and the page moves away from it.
    it.each(SUMMARY_ACTIONS)(
      "should run no other summary action after $action got a 409",
      async ({ run }) => {
        const { result } = renderSummaryHook();

        await act(async () => {
          await run(result.current);
        });
        for (const other of SUMMARY_ACTIONS) {
          await act(async () => {
            await other.run(result.current);
          });
        }

        expect(countSummaryRequests()).toBe(1);
        expect(result.current.isActionPending).toBe(true);
      },
    );

    it("should not move away after the page unmounts", async () => {
      const { result, unmount } = renderSummaryHook();
      await act(async () => {
        await result.current.handleUndo();
      });
      expect(result.current.leaving).toBe(true);

      unmount();
      vi.advanceTimersByTime(2_000);

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("should not move away from another summary when a late 409 arrives for the previous game", async () => {
      let rejectUndo!: (error: unknown) => void;
      undoLastThrowMock.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectUndo = reject;
        }),
      );
      const { result, rerender } = renderSummaryHook();
      let undo = Promise.resolve();
      act(() => {
        undo = result.current.handleUndo();
      });

      routeParams = { id: "43" };
      rerender();
      await act(async () => {
        rejectUndo(notNewest());
        await undo;
      });
      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      expect(result.current.leaving).toBe(false);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("should stay on the summary when another action error happens", async () => {
      undoLastThrowMock.mockRejectedValue(new Error("network down"));
      const { result } = renderSummaryHook();

      await act(async () => {
        await result.current.handleUndo();
      });
      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      expect(result.current.leaving).toBe(false);
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  describe("gameSummaryLoader", () => {
    beforeEach(() => {
      appQueryClient.clear();
    });

    it("should fill the finishedGame cache before the page renders", async () => {
      getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);

      await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

      expect(appQueryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual([
        finishedPlayer(3, "Carol"),
      ]);
    });

    it("should fill the game settings cache before the page renders", async () => {
      getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);
      getGameSettingsMock.mockResolvedValueOnce(SETTINGS_RESPONSE);

      await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

      expect(appQueryClient.getQueryData(gameQueries.settings(42).queryKey)).toEqual(
        SETTINGS_RESPONSE,
      );
    });

    it("should not throw when the settings fetch fails, so the page can show its Retry action", async () => {
      getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);
      getGameSettingsMock.mockRejectedValueOnce(new Error("network down"));

      await expect(
        gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" })),
      ).resolves.toBeNull();
    });

    it("should not fetch again when the game page already seeded the cache", async () => {
      appQueryClient.setQueryData(gameQueries.finished(42).queryKey, [finishedPlayer(3, "Carol")]);

      await gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" }));

      expect(getFinishedGameMock).not.toHaveBeenCalled();
    });

    it("should not throw when the fetch fails, so the page can show its Retry action", async () => {
      getFinishedGameMock.mockRejectedValueOnce(new Error("network down"));

      await expect(
        gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id: "42" })),
      ).resolves.toBeNull();
    });

    it.each(["abc", "0", "-5", "1e3"])(
      "should throw a 404 response and send no request for the invalid game id %s",
      async (id) => {
        await expect(
          gameSummaryLoader(makeLoaderArgs(new Request("http://x/"), { id })),
        ).rejects.toMatchObject({ status: 404 });

        expect(getTabletGameMock).not.toHaveBeenCalled();
        expect(getFinishedGameMock).not.toHaveBeenCalled();
        expect(getGameSettingsMock).not.toHaveBeenCalled();
      },
    );
  });

  describe("handlePlayAgain", () => {
    it("should call rematch adapter when finished game id is available", async () => {
      const { result } = renderSummaryHook();

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startRematchMock).toHaveBeenCalledWith(42);
      expect(startRematchMock).toHaveBeenCalledTimes(1);
    });

    it("should not set invitation when rematch adapter returns only game id", async () => {
      startRematchMock.mockResolvedValueOnce({
        success: true,
        gameId: 77,
        settings: {
          startScore: 501,
          doubleOut: true,
          tripleOut: false,
        },
      });

      const { result } = renderSummaryHook();

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(setInvitationMock).not.toHaveBeenCalled();
      expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    });

    it("should not call rematch adapter when finishedGameId is absent", async () => {
      routeParams = { id: undefined };

      const { result } = renderSummaryHook();

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startRematchMock).not.toHaveBeenCalled();
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
      async ({ playerCount, standings, podium, leaderboard }) => {
        getFinishedGameMock.mockResolvedValueOnce(
          buildFinishedPlayerResponses().slice(0, playerCount),
        );

        const { result } = renderSummaryHook();

        await waitFor(() => {
          expect(result.current.standings).toStrictEqual(standings);
        });
        expect(result.current.podiumData).toStrictEqual(podium);
        expect(result.current.leaderBoardList).toStrictEqual(leaderboard);
      },
    );
  });
});
