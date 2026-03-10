// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameThrowsResponse } from "@/types";
import { useGameLogic } from "./useGameLogic";

const navigateMock = vi.fn();
const useGameStateMock = vi.fn();
const useThrowHandlerMock = vi.fn();
const useRoomStreamMock = vi.fn();
const useGameSoundsMock = vi.fn();
const useWakeLockMock = vi.fn();
const useGameSettingsFlowMock = vi.fn();
const useGameExitFlowMock = vi.fn();

const handleThrowMock = vi.fn();
const handleUndoMock = vi.fn();
const refetchMock = vi.fn();
const updateGameSettingsMock = vi.fn();

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

vi.mock("./useGamePageEffects", () => ({
  useAutoFinishGame: vi.fn(),
  useGameSummaryNavigation: vi.fn(),
  useInteractionSoundUnlock: vi.fn(),
  useRoomEventRefetch: vi.fn(),
}));

vi.mock("./useGameActions", () => ({
  useGameSettingsFlow: (options: unknown) => useGameSettingsFlowMock(options),
  useGameExitFlow: (options: unknown) => useGameExitFlowMock(options),
}));

vi.mock("@/lib/soundPlayer", () => ({
  unlockSounds: vi.fn(),
}));

function buildGameData(status: GameThrowsResponse["status"]): GameThrowsResponse {
  return {
    id: 1,
    status,
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    players: [],
  };
}

function setDefaultMocks(gameData: GameThrowsResponse | null): void {
  useGameStateMock.mockReturnValue({
    gameData,
    isLoading: false,
    error: null,
    refetch: refetchMock,
    updateGameSettings: updateGameSettingsMock,
  });

  useThrowHandlerMock.mockReturnValue({
    handleThrow: handleThrowMock,
    handleUndo: handleUndoMock,
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

describe("useGameLogic wake-lock wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls useWakeLock(true) when game status is started", () => {
    setDefaultMocks(buildGameData("started"));

    renderHook(() => useGameLogic());

    expect(useGameStateMock).toHaveBeenCalledWith({ gameId: 1 });
    expect(useWakeLockMock.mock.calls.length).toBeGreaterThan(0);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(true);
  });

  it.each([
    ["missing game data", null],
    ["lobby status", buildGameData("lobby")],
    ["finished status", buildGameData("finished")],
  ] as const)("calls useWakeLock(false) for %s", (_label, gameData) => {
    setDefaultMocks(gameData);

    renderHook(() => useGameLogic());

    expect(useWakeLockMock.mock.calls.length).toBeGreaterThan(0);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(false);
  });

  it("updates wake-lock from true to false when started game becomes finished", () => {
    const state = {
      gameData: buildGameData("started") as GameThrowsResponse | null,
    };

    useGameStateMock.mockImplementation(() => ({
      gameData: state.gameData,
      isLoading: false,
      error: null,
      refetch: refetchMock,
      updateGameSettings: updateGameSettingsMock,
    }));
    useThrowHandlerMock.mockReturnValue({
      handleThrow: handleThrowMock,
      handleUndo: handleUndoMock,
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

    const { rerender } = renderHook(() => useGameLogic());

    expect(useWakeLockMock.mock.calls.length).toBeGreaterThan(0);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(true);
    const callsBeforeTransition = useWakeLockMock.mock.calls.length;

    state.gameData = buildGameData("finished");
    rerender();

    const callsAfterTransition = useWakeLockMock.mock.calls.length;
    expect(callsAfterTransition).toBeGreaterThan(callsBeforeTransition);
    const transitionCalls = useWakeLockMock.mock.calls.slice(callsBeforeTransition);
    expect(transitionCalls.length).toBeGreaterThan(0);
    expect(transitionCalls.at(-1)).toEqual([false]);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(false);
  });

  it("updates wake-lock from false to true when lobby game becomes started", () => {
    const state = {
      gameData: buildGameData("lobby") as GameThrowsResponse | null,
    };

    useGameStateMock.mockImplementation(() => ({
      gameData: state.gameData,
      isLoading: false,
      error: null,
      refetch: refetchMock,
      updateGameSettings: updateGameSettingsMock,
    }));
    useThrowHandlerMock.mockReturnValue({
      handleThrow: handleThrowMock,
      handleUndo: handleUndoMock,
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

    const { rerender } = renderHook(() => useGameLogic());

    expect(useWakeLockMock.mock.calls.length).toBeGreaterThan(0);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(false);
    const callsBeforeTransition = useWakeLockMock.mock.calls.length;

    state.gameData = buildGameData("started");
    rerender();

    const callsAfterTransition = useWakeLockMock.mock.calls.length;
    expect(callsAfterTransition).toBeGreaterThan(callsBeforeTransition);
    const transitionCalls = useWakeLockMock.mock.calls.slice(callsBeforeTransition);
    expect(transitionCalls.length).toBeGreaterThan(0);
    expect(transitionCalls.at(-1)).toEqual([true]);
    expect(useWakeLockMock).toHaveBeenLastCalledWith(true);
  });

  it("keeps the useGameLogic return contract after wake-lock wiring", () => {
    setDefaultMocks(buildGameData("started"));

    const { result } = renderHook(() => useGameLogic());

    const expectedKeys = [
      "gameId",
      "gameData",
      "isLoading",
      "error",
      "activePlayers",
      "finishedPlayers",
      "activePlayer",
      "shouldShowFinishOverlay",
      "isInteractionDisabled",
      "isUndoDisabled",
      "isSettingsOpen",
      "isSavingSettings",
      "settingsError",
      "pageError",
      "isExitOverlayOpen",
      "handleThrow",
      "handleUndo",
      "handleContinueGame",
      "handleUndoFromOverlay",
      "handleOpenSettings",
      "handleCloseSettings",
      "handleSaveSettings",
      "handleOpenExitOverlay",
      "handleCloseExitOverlay",
      "clearPageError",
      "handleExitGame",
      "refetch",
    ] as const;

    expectedKeys.forEach((key) => {
      expect(result.current).toHaveProperty(key);
    });

    expect(result.current.gameId).toBe(1);
    expect(result.current.handleThrow).toBe(handleThrowMock);
    expect(result.current.handleUndo).toBe(handleUndoMock);
    expect(result.current.refetch).toBe(refetchMock);
  });
});
