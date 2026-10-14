// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createElement } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createQueryClient, queryClient as appQueryClient } from "@/shared/query/queryClient";
import { gameQueries } from "@/shared/query/game.queries";
import { gameSummaryLoader, useGameSummaryPage } from "./useGameSummaryPage";
import { playSound } from "@/shared/services/browser/soundPlayer";
import type { GameThrowsResponse, ScoreboardDelta, UndoAckResponse } from "@/types";
import {
  buildExpectedPodiumPlaceholder,
  buildExpectedStandings,
  buildFinishedPlayerResponses,
} from "@/shared/types/game.test-support";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const getGameThrowsMock = vi.fn();
const createRematchGameMock = vi.fn();
const startRematchMock = vi.fn();
const undoLastThrowMock = vi.fn();
const setCurrentGameIdMock = vi.fn();
const setGameDataMock = vi.fn();
const setGameScoreboardDeltaMock = vi.fn();
const setInvitationMock = vi.fn();
const resetRoomStoreMock = vi.fn();

// Mutable state for router/store — allows per-test overrides without vi.doMock
let routeParams: { id?: string | undefined } = { id: "42" };
let testQueryClient: QueryClient;
let currentGameState: GameThrowsResponse | null = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => routeParams,
}));

vi.mock("@nanostores/react", () => ({
  useStore: (store: { get: () => unknown }) => store.get(),
}));

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
  getGameThrows: (...args: unknown[]) => getGameThrowsMock(...args),
  createRematchGame: (...args: unknown[]) => createRematchGameMock(...args),
  startRematch: (...args: unknown[]) => startRematchMock(...args),
  undoLastThrow: (...args: unknown[]) => undoLastThrowMock(...args),
}));

vi.mock("@/shared/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    $gameData: {
      get: () => currentGameState,
    },
    setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
    setGameData: (...args: unknown[]) => setGameDataMock(...args),
    setGameScoreboardDelta: (...args: unknown[]) => setGameScoreboardDeltaMock(...args),
    setInvitation: (...args: unknown[]) => setInvitationMock(...args),
    resetRoomStore: (...args: unknown[]) => resetRoomStoreMock(...args),
  };
});

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  playSound: vi.fn(),
}));

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

function applyScoreboardDelta(currentState: GameThrowsResponse, scoreboardDelta: ScoreboardDelta) {
  const changedPlayerById = new Map(
    scoreboardDelta.changedPlayers.map((playerDelta) => [playerDelta.playerId, playerDelta]),
  );
  const players = currentState.players.map((player) => {
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
    currentState.activePlayerId;
  const activePlayer = players.find((player) => player.id === activePlayerId);

  return {
    ...currentState,
    players,
    activePlayerId,
    currentRound: scoreboardDelta.currentRound,
    status: scoreboardDelta.status,
    winnerId: scoreboardDelta.winnerId,
    currentThrowCount: activePlayer
      ? Math.max(activePlayer.currentRoundThrows.length, activePlayer.throwsInCurrentRound)
      : currentState.currentThrowCount,
  };
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(QueryClientProvider, { client: testQueryClient }, children);
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
    setGameDataMock.mockReset();
    setGameScoreboardDeltaMock.mockReset();
    setCurrentGameIdMock.mockReset();
    setInvitationMock.mockReset();
    resetRoomStoreMock.mockReset();

    // Reset mutable router/store state to defaults before each test
    routeParams = { id: "42" };
    testQueryClient = createQueryClient();
    currentGameState = buildFinishedGameState();

    getFinishedGameMock.mockResolvedValue([]);
    getGameThrowsMock.mockResolvedValue(buildStartedGameState());
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
    setGameDataMock.mockImplementation((nextState: GameThrowsResponse | null) => {
      currentGameState = nextState;
    });
    setGameScoreboardDeltaMock.mockImplementation((scoreboardDelta: ScoreboardDelta) => {
      if (!currentGameState) {
        return;
      }

      currentGameState = applyScoreboardDelta(currentGameState, scoreboardDelta);
    });
  });

  it("should undo last throw and navigate back to game route when compact ack response is returned", async () => {
    undoLastThrowMock.mockResolvedValueOnce(
      buildUndoAck({
        scoreboardDelta: {
          changedPlayers: [
            {
              playerId: 1,
              name: "Alice",
              score: 20,
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

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        status: "started",
      }),
    );
    expect(setGameScoreboardDeltaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRound: 7,
        status: "started",
      }),
      42,
    );
    expect(getGameThrowsMock).not.toHaveBeenCalledWith(42);
    expect(playSound).toHaveBeenCalledWith("undo");
    expect(navigateMock).toHaveBeenCalledWith("/game/42", {
      state: { skipFinishOverlay: true },
    });
  });

  it("should keep supporting legacy full undo response when backend does not return compact ack", async () => {
    const legacyGameState = buildStartedGameState();
    undoLastThrowMock.mockResolvedValueOnce(legacyGameState);

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(setGameScoreboardDeltaMock).not.toHaveBeenCalled();
    expect(setGameDataMock).toHaveBeenCalledWith(legacyGameState);
    expect(navigateMock).toHaveBeenCalledWith("/game/42", {
      state: { skipFinishOverlay: true },
    });
  });

  it("should refresh full game state when compact undo cannot be applied locally", async () => {
    currentGameState = null;
    const refreshedGameState = buildStartedGameState();
    undoLastThrowMock.mockResolvedValueOnce(
      buildUndoAck({
        scoreboardDelta: {
          changedPlayers: [
            {
              playerId: 1,
              name: "Alice",
              score: 20,
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
    getGameThrowsMock.mockResolvedValueOnce(refreshedGameState);

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(setGameScoreboardDeltaMock).toHaveBeenCalledWith(expect.any(Object), 42);
    expect(getGameThrowsMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(refreshedGameState);
  });

  it("should not navigate when undo request fails", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));

    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameScoreboardDeltaMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
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
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(setGameDataMock).not.toHaveBeenCalled();
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

  it("should keep starting flag true when startRematch is pending and false after completion", async () => {
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

    expect(result.current.starting).toBe(true);

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

    expect(result.current.starting).toBe(false);
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
    const { result } = renderSummaryHook();

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(resetRoomStoreMock).toHaveBeenCalledTimes(1);
    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    expect(setInvitationMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/start/77");
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

  describe("gameSummaryLoader", () => {
    beforeEach(() => {
      appQueryClient.clear();
    });

    it("should fill the finishedGame cache before the page renders", async () => {
      getFinishedGameMock.mockResolvedValueOnce([finishedPlayer(3, "Carol")]);

      await gameSummaryLoader({ params: { id: "42" }, request: new Request("http://x/") });

      expect(appQueryClient.getQueryData(gameQueries.finished(42).queryKey)).toEqual([
        finishedPlayer(3, "Carol"),
      ]);
    });

    it("should not fetch again when the game page already seeded the cache", async () => {
      appQueryClient.setQueryData(gameQueries.finished(42).queryKey, [finishedPlayer(3, "Carol")]);

      await gameSummaryLoader({ params: { id: "42" }, request: new Request("http://x/") });

      expect(getFinishedGameMock).not.toHaveBeenCalled();
    });

    it.each(["abc", "0", "-1"])("should fetch nothing for the invalid game id %s", async (id) => {
      await expect(
        gameSummaryLoader({ params: { id }, request: new Request("http://x/") }),
      ).resolves.toBeNull();

      expect(getFinishedGameMock).not.toHaveBeenCalled();
    });
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
