// @vitest-environment jsdom

const updateGameSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/api/game", () => ({
  abortGame: vi.fn(),
  createRematch: vi.fn(),
  updateGameSettings: (...args: unknown[]) => updateGameSettingsMock(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";
import { useGameSettingsFlow } from "./useGameActions";

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
