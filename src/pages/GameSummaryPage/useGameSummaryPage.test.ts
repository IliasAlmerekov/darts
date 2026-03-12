// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { playSound } from "@/lib/soundPlayer";
import type { GameThrowsResponse, ScoreboardDelta, UndoAckResponse } from "@/types";

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
const setLastFinishedGameSummaryMock = vi.fn();
const resetRoomStoreMock = vi.fn();

// Mutable state for router/store — allows per-test overrides without vi.doMock
let locationState: { finishedGameId?: number; summary?: unknown } | null = { finishedGameId: 42 };
let routeParams: { id?: string | undefined } = { id: "42" };
let lastFinishedGameSummaryStore: {
  gameId: number;
  summary: Array<{
    playerId: number;
    username: string;
    position: number;
    roundsPlayed: number;
    roundAverage: number;
  }>;
} | null = null;
let currentGameState: GameThrowsResponse | null = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: locationState }),
  useParams: () => routeParams,
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
    $lastFinishedGameSummary: {
      get: () => lastFinishedGameSummaryStore,
    },
    setCurrentGameId: (...args: unknown[]) => setCurrentGameIdMock(...args),
    setGameData: (...args: unknown[]) => setGameDataMock(...args),
    setGameScoreboardDelta: (...args: unknown[]) => setGameScoreboardDeltaMock(...args),
    setInvitation: (...args: unknown[]) => setInvitationMock(...args),
    setLastFinishedGameSummary: (...args: unknown[]) => setLastFinishedGameSummaryMock(...args),
    resetRoomStore: (...args: unknown[]) => resetRoomStoreMock(...args),
  };
});

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

function buildFinishedGameState(): GameThrowsResponse {
  return {
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
  return {
    ...buildFinishedGameState(),
    status: "started",
    currentRound: 7,
    currentThrowCount: 2,
    winnerId: null,
    players: [
      {
        ...buildFinishedGameState().players[0]!,
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
        ...buildFinishedGameState().players[1]!,
      },
    ],
  };
}

function buildUndoAck(overrides: Partial<UndoAckResponse> = {}): UndoAckResponse {
  return {
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

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGameDataMock.mockReset();
    setGameScoreboardDeltaMock.mockReset();
    setCurrentGameIdMock.mockReset();
    setInvitationMock.mockReset();
    setLastFinishedGameSummaryMock.mockReset();
    resetRoomStoreMock.mockReset();

    // Reset mutable router/store state to defaults before each test
    locationState = { finishedGameId: 42 };
    routeParams = { id: "42" };
    lastFinishedGameSummaryStore = null;
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

  it("undoes last throw from compact ack and navigates back to game route", async () => {
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

    const { result } = renderHook(() => useGameSummaryPage());

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

  it("keeps supporting the legacy full undo response", async () => {
    const legacyGameState = buildStartedGameState();
    undoLastThrowMock.mockResolvedValueOnce(legacyGameState);

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(setGameScoreboardDeltaMock).not.toHaveBeenCalled();
    expect(setGameDataMock).toHaveBeenCalledWith(legacyGameState);
    expect(navigateMock).toHaveBeenCalledWith("/game/42", {
      state: { skipFinishOverlay: true },
    });
  });

  it("falls back to full game refresh when compact undo cannot be applied locally", async () => {
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

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(setGameScoreboardDeltaMock).toHaveBeenCalledWith(expect.any(Object), 42);
    expect(getGameThrowsMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).toHaveBeenCalledWith(refreshedGameState);
  });

  it("does not navigate when undo fails", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameScoreboardDeltaMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
  });

  it("navigates to game route after startRematch resolves", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(startRematchMock).toHaveBeenCalledWith(42);
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  it("does not overwrite shared game state when starting a rematch", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(setInvitationMock).toHaveBeenCalledWith({
      gameId: 77,
      invitationLink: "/invite/77",
    });
  });

  it("does not navigate when startRematch fails", async () => {
    startRematchMock.mockRejectedValueOnce(new Error("server error"));

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(startRematchMock).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it("prevents concurrent handlePlayAgain calls while starting", async () => {
    let resolveStartRematch!: (value: {
      success: boolean;
      gameId: number;
      settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
      invitationLink?: string;
    }) => void;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    let firstCall: Promise<void>;
    await act(async () => {
      firstCall = result.current.handlePlayAgain();
    });

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    await act(async () => {
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await firstCall!;
    });

    expect(startRematchMock).toHaveBeenCalledTimes(1);
  });

  it("navigate is called after startRematch resolves, not before", async () => {
    let resolveStartRematch!: (value: {
      success: boolean;
      gameId: number;
      settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
      invitationLink?: string;
    }) => void;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    let callPromise: Promise<void>;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await callPromise!;
    });

    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  it("starting flag is true while startRematch is pending and false after", async () => {
    let resolveStartRematch!: (value: {
      success: boolean;
      gameId: number;
      settings: { startScore: number; doubleOut: boolean; tripleOut: boolean };
      invitationLink?: string;
    }) => void;
    startRematchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStartRematch = resolve;
        }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    let callPromise: Promise<void>;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(result.current.starting).toBe(true);

    await act(async () => {
      resolveStartRematch({
        success: true,
        gameId: 77,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: false,
        },
      });
      await callPromise!;
    });

    expect(result.current.starting).toBe(false);
  });

  it("does not navigate when rematch response misses game id", async () => {
    startRematchMock.mockResolvedValueOnce({
      success: false,
      gameId: 0,
      settings: {
        startScore: 301,
        doubleOut: false,
        tripleOut: false,
      },
    });

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalledWith("/start/77");
  });

  it("does not overwrite shared game state when returning to start from summary", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleBackToStart();
    });

    expect(resetRoomStoreMock).toHaveBeenCalledTimes(1);
    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    expect(setInvitationMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/start/77");
  });

  it("keeps action handlers referentially stable across rerenders when dependencies do not change", async () => {
    const { result } = renderHook(() => useGameSummaryPage());
    const initialHandleUndo = result.current.handleUndo;
    const initialHandlePlayAgain = result.current.handlePlayAgain;
    const initialHandleBackToStart = result.current.handleBackToStart;

    await waitFor(() => {
      expect(getFinishedGameMock).toHaveBeenCalledWith(42);
    });

    expect(result.current.handleUndo).toBe(initialHandleUndo);
    expect(result.current.handlePlayAgain).toBe(initialHandlePlayAgain);
    expect(result.current.handleBackToStart).toBe(initialHandleBackToStart);
  });

  it("uses summary from navigation state without refetching finished game", async () => {
    locationState = {
      finishedGameId: 42,
      summary: [
        {
          playerId: 1,
          username: "Alice",
          position: 1,
          roundsPlayed: 5,
          roundAverage: 60.2,
        },
      ],
    };

    const { result } = renderHook(() => useGameSummaryPage());

    expect(getFinishedGameMock).not.toHaveBeenCalled();
    expect(result.current.newList).toEqual([
      expect.objectContaining({
        id: 1,
        name: "Alice",
        scoreAverage: 60.2,
        roundCount: 5,
      }),
    ]);
    expect(setLastFinishedGameSummaryMock).toHaveBeenCalledWith({
      gameId: 42,
      summary: [
        {
          playerId: 1,
          username: "Alice",
          position: 1,
          roundsPlayed: 5,
          roundAverage: 60.2,
        },
      ],
    });
  });

  it("uses summary from store without refetching finished game", () => {
    locationState = { finishedGameId: 42 };
    lastFinishedGameSummaryStore = {
      gameId: 42,
      summary: [
        {
          playerId: 2,
          username: "Bob",
          position: 1,
          roundsPlayed: 4,
          roundAverage: 45.5,
        },
      ],
    };

    const { result } = renderHook(() => useGameSummaryPage());

    expect(getFinishedGameMock).not.toHaveBeenCalled();
    expect(result.current.newList).toEqual([
      expect.objectContaining({
        id: 2,
        name: "Bob",
        scoreAverage: 45.5,
        roundCount: 4,
      }),
    ]);
    expect(setLastFinishedGameSummaryMock).not.toHaveBeenCalled();
  });

  it("fetches summary from backend for direct URL entry when navigation state and cache are absent", async () => {
    locationState = null;
    routeParams = { id: "42" };
    getFinishedGameMock.mockResolvedValueOnce([
      {
        playerId: 3,
        username: "Carol",
        position: 1,
        roundsPlayed: 6,
        roundAverage: 75.4,
      },
    ]);

    const { result } = renderHook(() => useGameSummaryPage());

    await waitFor(() => {
      expect(getFinishedGameMock).toHaveBeenCalledWith(42);
    });
    await waitFor(() => {
      expect(result.current.newList).toEqual([
        expect.objectContaining({
          id: 3,
          name: "Carol",
          scoreAverage: 75.4,
          roundCount: 6,
        }),
      ]);
    });
    expect(setLastFinishedGameSummaryMock).toHaveBeenCalledWith({
      gameId: 42,
      summary: [
        {
          playerId: 3,
          username: "Carol",
          position: 1,
          roundsPlayed: 6,
          roundAverage: 75.4,
        },
      ],
    });
  });

  describe("handlePlayAgain", () => {
    it("calls the rematch adapter with the finished game id", async () => {
      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startRematchMock).toHaveBeenCalledWith(42);
      expect(startRematchMock).toHaveBeenCalledTimes(1);
    });

    it("does not set invitation when the rematch adapter returns only a game id", async () => {
      startRematchMock.mockResolvedValueOnce({
        success: true,
        gameId: 77,
        settings: {
          startScore: 501,
          doubleOut: true,
          tripleOut: false,
        },
      });

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(setInvitationMock).not.toHaveBeenCalled();
      expect(setCurrentGameIdMock).toHaveBeenCalledWith(77);
    });

    it("does not call the rematch adapter when finishedGameId is absent", async () => {
      locationState = null;
      routeParams = { id: undefined };

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startRematchMock).not.toHaveBeenCalled();
    });
  });
});
