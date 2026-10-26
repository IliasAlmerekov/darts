// @vitest-environment jsdom

const updateGameSettingsMock = vi.hoisted(() => vi.fn());
const clientLoggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/api/game", () => ({
  abortGame: vi.fn(),
  createRematch: vi.fn(),
  getGameThrows: vi.fn(),
  updateGameSettings: (...args: unknown[]) => updateGameSettingsMock(...args),
}));

vi.mock("@/shared/store", () => ({
  resetRoomStore: vi.fn(),
  setInvitation: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: clientLoggerErrorMock, warn: vi.fn() },
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";
import { ApiError } from "@/shared/api";
import { abortGame, createRematch, getGameThrows } from "@/shared/api/game";
import { setInvitation } from "@/shared/store";
import { useGameExitFlow, useGameSettingsFlow } from "./useGameActions";

function createGameData(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 42,
    status: "started",
    currentRound: 2,
    activePlayerId: 7,
    currentThrowCount: 1,
    winnerId: null,
    players: [
      {
        id: 7,
        name: "P1",
        score: 261,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 1,
        currentRoundThrows: [{ value: 20, isDouble: true, isTriple: false, isBust: false }],
        roundHistory: [],
        isGuest: false,
      },
    ],
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

describe("useGameSettingsFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should merge compact settings response into game state when settings are saved", async () => {
    const updateGameSettingsStore = vi.fn();
    const updatedSettings: GameSettingsResponse = {
      gameId: 42,
      status: "started",
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    };
    updateGameSettingsMock.mockResolvedValueOnce(updatedSettings);

    const { result } = renderHook(() =>
      useGameSettingsFlow({
        gameData: createGameData(),
        gameId: 42,
        updateGameSettings: updateGameSettingsStore,
      }),
    );

    act(() => {
      result.current.handleOpenSettings();
    });

    await act(async () => {
      await result.current.handleSaveSettings({
        doubleOut: true,
        tripleOut: false,
      });
    });

    await waitFor(() => {
      expect(updateGameSettingsMock).toHaveBeenCalledWith(42, {
        doubleOut: true,
        tripleOut: false,
      });
    });

    expect(updateGameSettingsStore).toHaveBeenCalledWith(updatedSettings);
    expect(result.current.isSettingsOpen).toBe(false);
    expect(result.current.settingsError).toBeNull();
  });
});

describe("useGameExitFlow", () => {
  const abortNotAllowed = () =>
    new ApiError("Conflict", { status: 409, data: { error: "GAME_ABORT_NOT_ALLOWED" } });

  function renderExitFlow() {
    const navigate = vi.fn();
    const setPageError = vi.fn();
    const { result } = renderHook(() => useGameExitFlow({ gameId: 42, navigate, setPageError }));
    return { navigate, result, setPageError };
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should abort, create a rematch and open the new lobby when a started game is left", async () => {
    vi.mocked(abortGame).mockResolvedValueOnce({ success: true, message: "ok" });
    vi.mocked(createRematch).mockResolvedValueOnce({
      success: true,
      gameId: 43,
      invitationLink: "https://example.test/join/abc",
    });
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(abortGame).toHaveBeenCalledWith(42);
    expect(createRematch).toHaveBeenCalledWith(42);
    expect(setInvitation).toHaveBeenCalledWith({
      gameId: 43,
      invitationLink: "https://example.test/join/abc",
    });
    expect(navigate).toHaveBeenCalledWith("/start/43");
    expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("should open the summary without error or rematch when abort is refused for a finished game", async () => {
    vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
    vi.mocked(getGameThrows).mockResolvedValueOnce({
      ...createGameData(),
      status: "finished",
      winnerId: 7,
    });
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(getGameThrows).toHaveBeenCalledWith(42);
    expect(createRematch).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/summary/42", {
      state: { finishedGameId: 42 },
    });
    expect(setPageError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it.each([
    [
      "the game is still in the lobby",
      () => Promise.resolve<GameThrowsResponse>({ ...createGameData(), status: "lobby" }),
    ],
    ["the fresh read fails", () => Promise.reject<GameThrowsResponse>(new Error("offline"))],
  ])("should keep the page error when abort is refused and %s", async (_name, readGame) => {
    vi.mocked(abortGame).mockRejectedValueOnce(abortNotAllowed());
    vi.mocked(getGameThrows).mockImplementationOnce(readGame);
    const { navigate, result, setPageError } = renderExitFlow();

    await act(async () => {
      await result.current.handleExitGame();
    });

    expect(createRematch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(setPageError).toHaveBeenLastCalledWith(
      "This game can no longer be left. Please reload the page.",
    );
    expect(clientLoggerErrorMock).toHaveBeenCalledWith(
      "game.exit.failed",
      expect.objectContaining({ context: { gameId: 42 } }),
    );
  });
});
