// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse } from "@/types";
import { useGameLogic } from "./useGameLogic";

const navigateMock = vi.fn();
const useGameStateMock = vi.fn();
const useThrowHandlerMock = vi.fn();
const useRoomStreamMock = vi.fn();
const useGameSoundsMock = vi.fn();
const useWakeLockMock = vi.fn();
const finishGameMock = vi.fn();
const resetGameStateVersionMock = vi.fn();
const setLastFinishedGameSummaryMock = vi.fn();
const updateGameSettingsMock = vi.fn();
const useGameSettingsFlowMock = vi.fn();
const useGameExitFlowMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: null }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("@/shared/hooks/useRoomStream", () => ({
  useRoomStream: (gameId: number | null) => useRoomStreamMock(gameId),
}));

vi.mock("./useGameState", () => ({
  useGameState: (options: { gameId: number | null }) => useGameStateMock(options),
}));

vi.mock("./useThrowHandler", () => ({
  useThrowHandler: (options: { gameId: number | null }) => useThrowHandlerMock(options),
}));

vi.mock("./useGameSounds", () => ({
  useGameSounds: (gameData: GameThrowsResponse | null) => useGameSoundsMock(gameData),
}));

vi.mock("./useWakeLock", () => ({
  useWakeLock: (isEnabled: boolean) => useWakeLockMock(isEnabled),
}));

vi.mock("./useGamePageEffects", async () => {
  const actual =
    await vi.importActual<typeof import("./useGamePageEffects")>("./useGamePageEffects");

  return {
    ...actual,
    useGameSummaryNavigation: vi.fn(),
    useInteractionSoundUnlock: vi.fn(),
    useRoomEventRefetch: vi.fn(),
  };
});

vi.mock("./useGameActions", () => ({
  useGameSettingsFlow: (options: unknown) => useGameSettingsFlowMock(options),
  useGameExitFlow: (options: unknown) => useGameExitFlowMock(options),
}));

vi.mock("@/shared/api/game", () => ({
  updateGameSettings: vi.fn(),
  createRematch: vi.fn(),
  abortGame: vi.fn(),
  finishGame: (...args: unknown[]) => finishGameMock(...args),
  resetGameStateVersion: (...args: unknown[]) => resetGameStateVersionMock(...args),
}));

vi.mock("@/shared/store", () => ({
  setInvitation: vi.fn(),
  resetRoomStore: vi.fn(),
  setLastFinishedGameSummary: (...args: unknown[]) => setLastFinishedGameSummaryMock(...args),
}));

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  unlockSounds: vi.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function buildAutoFinishGameData(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 1,
    status: "started",
    currentRound: 4,
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
        score: 26,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
      {
        id: 2,
        name: "P2",
        score: 0,
        isActive: false,
        isBust: false,
        position: 1,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [{ throws: [{ value: 20 }] }],
      },
    ],
  };
}

function setDefaultMocks(gameData: GameThrowsResponse | null): void {
  useGameStateMock.mockReturnValue({
    gameData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updateGameSettings: updateGameSettingsMock,
  });
  useThrowHandlerMock.mockReturnValue({
    handleThrow: vi.fn(),
    handleUndo: vi.fn(),
  });
  useRoomStreamMock.mockReturnValue({ event: null });
  useGameSoundsMock.mockReturnValue(undefined);
  useWakeLockMock.mockReturnValue(undefined);
  useGameSettingsFlowMock.mockReturnValue({
    handleCloseSettings: vi.fn(),
    handleOpenSettings: vi.fn(),
    handleSaveSettings: vi.fn(),
    isSavingSettings: false,
    isSettingsOpen: false,
    settingsError: null,
  });
  useGameExitFlowMock.mockReturnValue({
    handleCloseExitOverlay: vi.fn(),
    handleExitGame: vi.fn(),
    handleOpenExitOverlay: vi.fn(),
    isExitOverlayOpen: false,
  });
}

describe("useGameLogic auto-finish abort handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to summary with finish payload and caches it after auto-finish", async () => {
    const summaryPayload = [
      {
        playerId: 2,
        username: "Winner",
        position: 1,
        roundsPlayed: 3,
        roundAverage: 55.5,
      },
    ];

    setDefaultMocks(buildAutoFinishGameData());
    finishGameMock.mockResolvedValue(summaryPayload);

    renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/summary/1", {
        state: {
          finishedGameId: 1,
          summary: summaryPayload,
        },
      });
    });

    expect(setLastFinishedGameSummaryMock).toHaveBeenCalledWith({
      gameId: 1,
      summary: summaryPayload,
    });
    expect(resetGameStateVersionMock).toHaveBeenCalledWith(1);
  });

  it("passes AbortSignal to finishGame and aborts it on unmount", async () => {
    setDefaultMocks(buildAutoFinishGameData());
    finishGameMock.mockImplementation(() => new Promise(() => {}));

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    const finishSignal = finishGameMock.mock.calls[0]?.[1] as AbortSignal | undefined;
    expect(finishSignal).toBeInstanceOf(AbortSignal);

    unmount();

    expect(finishSignal?.aborted).toBe(true);
  });

  it("ignores AbortError from auto-finish requests after cleanup", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const pendingFinish = deferred<never>();

    setDefaultMocks(buildAutoFinishGameData());
    finishGameMock.mockReturnValue(pendingFinish.promise);

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    unmount();
    pendingFinish.reject(createAbortError());

    await act(async () => {
      await pendingFinish.promise.catch(() => undefined);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(updateGameSettingsMock).not.toHaveBeenCalled();
    expect(resetGameStateVersionMock).not.toHaveBeenCalled();
  });

  it("does not navigate to summary from a local optimistic finished status while auto-finish is pending", async () => {
    const pendingFinish = deferred<never>();

    setDefaultMocks(buildAutoFinishGameData());
    finishGameMock.mockReturnValue(pendingFinish.promise);

    const { unmount } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(finishGameMock).toHaveBeenCalledTimes(1);
    });

    expect(updateGameSettingsMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(resetGameStateVersionMock).not.toHaveBeenCalled();

    unmount();
  });
});
