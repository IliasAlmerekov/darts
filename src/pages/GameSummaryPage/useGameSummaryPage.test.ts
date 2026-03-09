// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { playSound } from "@/lib/soundPlayer";

const navigateMock = vi.fn();
const getFinishedGameMock = vi.fn();
const createRematchMock = vi.fn();
const startGameMock = vi.fn();
const undoLastThrowMock = vi.fn();
const setGameDataMock = vi.fn();
const setInvitationMock = vi.fn();
const setLastFinishedGameIdMock = vi.fn();
const resetRoomStoreMock = vi.fn();
const getGameSettingsMock = vi.fn();

// Mutable state for router/store — allows per-test overrides without vi.doMock
let locationState: { finishedGameId?: number } | null = { finishedGameId: 42 };
let routeParams: { id?: string | undefined } = { id: "42" };
let storeGameSettings: { startScore: number; doubleOut: boolean; tripleOut: boolean } | null = {
  startScore: 301,
  doubleOut: false,
  tripleOut: false,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: locationState }),
  useParams: () => routeParams,
}));

vi.mock("@/shared/api/game", () => ({
  getFinishedGame: (...args: unknown[]) => getFinishedGameMock(...args),
  getGameSettings: (...args: unknown[]) => getGameSettingsMock(...args),
  createRematch: (...args: unknown[]) => createRematchMock(...args),
  startGame: (...args: unknown[]) => startGameMock(...args),
  undoLastThrow: (...args: unknown[]) => undoLastThrowMock(...args),
}));

vi.mock("@/store", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    $gameSettings: { key: "gameSettings" },
    setGameData: (...args: unknown[]) => setGameDataMock(...args),
    setInvitation: (...args: unknown[]) => setInvitationMock(...args),
    setLastFinishedGameId: (...args: unknown[]) => setLastFinishedGameIdMock(...args),
    resetRoomStore: (...args: unknown[]) => resetRoomStoreMock(...args),
  };
});

vi.mock("@nanostores/react", () => ({
  useStore: () => storeGameSettings,
}));

vi.mock("@/lib/soundPlayer", () => ({
  playSound: vi.fn(),
}));

describe("useGameSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGameDataMock.mockReset();
    setInvitationMock.mockReset();
    setLastFinishedGameIdMock.mockReset();
    resetRoomStoreMock.mockReset();

    // Reset mutable router/store state to defaults before each test
    locationState = { finishedGameId: 42 };
    routeParams = { id: "42" };
    storeGameSettings = { startScore: 301, doubleOut: false, tripleOut: false };

    getFinishedGameMock.mockResolvedValue([]);
    startGameMock.mockResolvedValue(undefined);
    getGameSettingsMock.mockResolvedValue({
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    });
    createRematchMock.mockResolvedValue({
      success: true,
      gameId: 77,
      invitationLink: "/invite/77",
    });
    undoLastThrowMock.mockResolvedValue({
      id: 42,
      status: "started",
      currentRound: 1,
      activePlayerId: 1,
      currentThrowCount: 0,
      winnerId: null,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [],
    });
  });

  it("undoes last throw and navigates back to game route", async () => {
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
    expect(playSound).toHaveBeenCalledWith("undo");
    expect(navigateMock).toHaveBeenCalledWith("/game/42", {
      state: { skipFinishOverlay: true },
    });
  });

  it("does not navigate when undo fails", async () => {
    undoLastThrowMock.mockRejectedValueOnce(new Error("undo failed"));

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(undoLastThrowMock).toHaveBeenCalledWith(42);
    expect(setGameDataMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/game/42");
  });

  it("navigates to game route after startGame resolves", async () => {
    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(createRematchMock).toHaveBeenCalledWith(42);
    expect(startGameMock).toHaveBeenCalledWith(77, {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
      round: 1,
      status: "started",
    });
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

  it("does not navigate when startGame fails", async () => {
    startGameMock.mockRejectedValueOnce(new Error("server error"));

    const { result } = renderHook(() => useGameSummaryPage());

    await act(async () => {
      await result.current.handlePlayAgain();
    });

    expect(startGameMock).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it("prevents concurrent handlePlayAgain calls while starting", async () => {
    let resolveStartGame!: () => void;
    startGameMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStartGame = resolve;
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
      resolveStartGame();
      await firstCall!;
    });

    expect(createRematchMock).toHaveBeenCalledTimes(1);
    expect(startGameMock).toHaveBeenCalledTimes(1);
  });

  it("navigate is called after startGame resolves, not before", async () => {
    let resolveStartGame!: () => void;
    startGameMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStartGame = resolve;
        }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    let callPromise: Promise<void>;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(navigateMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveStartGame();
      await callPromise!;
    });

    expect(navigateMock).toHaveBeenCalledWith("/game/77");
  });

  it("starting flag is true while startGame is pending and false after", async () => {
    let resolveStartGame!: () => void;
    startGameMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStartGame = resolve;
        }),
    );

    const { result } = renderHook(() => useGameSummaryPage());

    let callPromise: Promise<void>;
    await act(async () => {
      callPromise = result.current.handlePlayAgain();
    });

    expect(result.current.starting).toBe(true);

    await act(async () => {
      resolveStartGame();
      await callPromise!;
    });

    expect(result.current.starting).toBe(false);
  });

  it("does not navigate when rematch response misses game id", async () => {
    createRematchMock.mockResolvedValueOnce({
      success: false,
      gameId: 0,
      invitationLink: "",
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
    expect(setInvitationMock).toHaveBeenCalledWith({
      gameId: 77,
      invitationLink: "/invite/77",
    });
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

  // ---------------------------------------------------------------------------
  // Ticket 3 — Rematch stale settings
  // handlePlayAgain must fetch canonical game settings from the server using
  // finishedGameId instead of reading from the local $gameSettings store.
  // After a page refresh or cold start the store may hold default/stale values.
  // ---------------------------------------------------------------------------
  describe("handlePlayAgain — canonical settings (Ticket 3)", () => {
    it("should fetch game settings from API with finishedGameId before starting rematch", async () => {
      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(getGameSettingsMock).toHaveBeenCalledWith(42);
      expect(getGameSettingsMock).toHaveBeenCalledTimes(1);
    });

    it("should use canonical settings from API, not values from local store", async () => {
      // Local store has stale 301 defaults, but the finished game used 501/doubleOut.
      getGameSettingsMock.mockResolvedValueOnce({
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      });

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startGameMock).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          startScore: 501,
          doubleOut: true,
          tripleOut: false,
        }),
      );
    });

    it("should use canonical settings from API when local store is null after cold start", async () => {
      // Simulate cold start: store has no persisted state.
      storeGameSettings = null;

      getGameSettingsMock.mockResolvedValueOnce({
        startScore: 501,
        doubleOut: false,
        tripleOut: true,
      });

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(getGameSettingsMock).toHaveBeenCalledWith(42);
      expect(startGameMock).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          startScore: 501,
          doubleOut: false,
          tripleOut: true,
        }),
      );
    });

    it("should not call startGame and should set error when getGameSettings fails", async () => {
      getGameSettingsMock.mockRejectedValueOnce(new Error("settings not found"));

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(startGameMock).not.toHaveBeenCalled();
      expect(navigateMock).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
    });

    it("should not call getGameSettings when finishedGameId is absent", async () => {
      // Simulate direct navigation to /summary without a game id (no location state, no route param).
      locationState = null;
      routeParams = { id: undefined };

      const { result } = renderHook(() => useGameSummaryPage());

      await act(async () => {
        await result.current.handlePlayAgain();
      });

      expect(getGameSettingsMock).not.toHaveBeenCalled();
      expect(createRematchMock).not.toHaveBeenCalled();
    });
  });
});
