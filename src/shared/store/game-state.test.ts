// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  $error,
  $gameData,
  $gameSettings,
  $isLoading,
  getCachedGameSettings,
  setError,
  resetGameStore,
  setGameData,
  setGameScoreboardDelta,
  setGameSettings,
  setLoading,
} from "./game-state";
import * as gameStateNormalizer from "../lib/gameStateNormalizer";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";

const mockGameData: GameThrowsResponse = {
  id: 1,
  activePlayerId: 1,
  currentRound: 3,
  currentThrowCount: 2,
  status: "started",
  winnerId: null,
  settings: {
    startScore: 501,
    doubleOut: true,
    tripleOut: false,
  },
  players: [
    {
      id: 1,
      name: "Alice",
      score: 301,
      isActive: true,
      position: 0,
      isBust: false,
      throwsInCurrentRound: 2,
      roundHistory: [],
      currentRoundThrows: [],
    },
    {
      id: 2,
      name: "Bob",
      score: 401,
      isActive: false,
      position: 1,
      isBust: false,
      throwsInCurrentRound: 0,
      roundHistory: [],
      currentRoundThrows: [],
    },
  ],
};

function makeGameData(overrides?: Partial<GameThrowsResponse>): GameThrowsResponse {
  return { ...mockGameData, ...overrides };
}

describe("game-state store", () => {
  beforeEach(() => {
    resetGameStore();
  });

  describe("setGameData", () => {
    it("should set normalized game data and clear error", () => {
      setError(new Error("previous error"));

      setGameData({
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0]!,
            score: 26,
            isActive: true,
            position: 0,
          },
          {
            ...mockGameData.players[1]!,
            score: 0,
            isActive: false,
            position: 1,
          },
        ],
      });

      expect($gameData.get()?.winnerId).toBe(1);
      expect($gameSettings.get()).toEqual(mockGameData.settings);
      expect($error.get()).toBeNull();
    });

    it("should trust the only active player flag when activePlayerId is stale", () => {
      setGameData({
        ...mockGameData,
        activePlayerId: 1,
        currentThrowCount: 0,
        players: [
          {
            ...mockGameData.players[0]!,
            isActive: false,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
          },
          {
            ...mockGameData.players[1]!,
            isActive: true,
            position: null,
          },
        ],
      });

      expect($gameData.get()?.activePlayerId).toBe(2);
      expect($gameData.get()?.players[0]?.isActive).toBe(false);
      expect($gameData.get()?.players[1]?.isActive).toBe(true);
    });

    it("should handle null game data", () => {
      setGameData(mockGameData);
      setGameData(null);

      expect($gameData.get()).toBeNull();
    });
  });

  describe("setGameSettings", () => {
    it("should update only the settings fragment for the active game", () => {
      setGameData(mockGameData);

      setGameSettings(
        {
          startScore: 301,
          doubleOut: false,
          tripleOut: true,
        },
        1,
      );

      expect($gameData.get()).toEqual({
        ...mockGameData,
        settings: {
          startScore: 301,
          doubleOut: false,
          tripleOut: true,
        },
      });
      expect($gameSettings.get()).toEqual({
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      });
    });

    it("should ignore settings updates for a different game id", () => {
      setGameData(mockGameData);

      setGameSettings(
        {
          startScore: 301,
          doubleOut: false,
          tripleOut: true,
        },
        99,
      );

      expect($gameData.get()).toEqual(mockGameData);
      expect($gameData.get()?.settings).toEqual(mockGameData.settings);
      expect(getCachedGameSettings(99)).toEqual({
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      });
    });
  });

  describe("setGameScoreboardDelta", () => {
    it("should store the patched scoreboard state for the active game", () => {
      setGameData({
        ...mockGameData,
        currentRound: 5,
        currentThrowCount: 2,
        players: [
          {
            ...mockGameData.players[0]!,
            score: 40,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...mockGameData.players[1]!,
            score: 101,
            isActive: false,
          },
        ],
      });

      const nextGameData = setGameScoreboardDelta(
        {
          changedPlayers: [
            {
              playerId: 1,
              name: "Alice",
              score: 60,
              position: null,
              isActive: false,
              isGuest: false,
              isBust: false,
            },
            {
              playerId: 2,
              name: "Bob",
              score: 101,
              position: 1,
              isActive: true,
              isGuest: false,
              isBust: false,
            },
          ],
          winnerId: null,
          status: "started",
          currentRound: 6,
        },
        1,
      );

      expect(nextGameData).toBeUndefined();
      expect($gameData.get()).toEqual({
        ...mockGameData,
        activePlayerId: 2,
        currentRound: 6,
        currentThrowCount: 0,
        status: "started",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0]!,
            score: 60,
            isActive: false,
            position: null,
            isBust: false,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...mockGameData.players[1]!,
            score: 101,
            isActive: true,
            position: 1,
            isBust: false,
          },
        ],
      });
      expect($error.get()).toBeNull();
    });

    it("should ignore scoreboard updates for a different game id", () => {
      setGameData(mockGameData);

      const nextGameData = setGameScoreboardDelta(
        {
          changedPlayers: [],
          winnerId: null,
          status: "started",
          currentRound: 4,
        },
        99,
      );

      expect(nextGameData).toBeUndefined();
      expect($gameData.get()).toEqual(mockGameData);
    });
  });

  describe("setLoading", () => {
    it("should set loading state to true", () => {
      setLoading(true);
      expect($isLoading.get()).toBe(true);
    });

    it("should set loading state to false", () => {
      setLoading(true);
      setLoading(false);
      expect($isLoading.get()).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error", () => {
      const error = new Error("test error");
      setError(error);
      expect($error.get()).toBe(error);
    });

    it("should clear error when set to null", () => {
      setError(new Error("test"));
      setError(null);
      expect($error.get()).toBeNull();
    });
  });

  describe("resetGameStore", () => {
    it("should reset all state to initial values", () => {
      setGameData(mockGameData);
      setLoading(true);
      setError(new Error("error"));

      resetGameStore();

      expect($gameData.get()).toBeNull();
      expect($isLoading.get()).toBe(false);
      expect($error.get()).toBeNull();
      expect(getCachedGameSettings(1)).toBeNull();
    });
  });

  // --- TICKET-09 ---
  describe("setGameSettings — TICKET-09 (normalizeGameData not called)", () => {
    let normalizeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      normalizeSpy = vi.spyOn(gameStateNormalizer, "normalizeGameData");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should update settings correctly when $gameData is set", () => {
      setGameData(makeGameData());
      normalizeSpy.mockClear();

      const newSettings: GameSettingsResponse = {
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      };
      setGameSettings(newSettings, 1);

      expect($gameData.get()?.settings).toEqual(newSettings);
    });

    it("should not change players, activePlayerId and winnerId by reference", () => {
      setGameData(makeGameData());
      normalizeSpy.mockClear();

      const before = $gameData.get()!;
      setGameSettings({ startScore: 301, doubleOut: false, tripleOut: true }, before.id);
      const after = $gameData.get()!;

      expect(after.players).toBe(before.players);
      expect(after.activePlayerId).toBe(before.activePlayerId);
      expect(after.winnerId).toBe(before.winnerId);
    });

    it("should not call normalizeGameData when updating settings", () => {
      setGameData(makeGameData());
      normalizeSpy.mockClear();

      setGameSettings({ startScore: 301, doubleOut: false, tripleOut: true }, 1);

      expect(normalizeSpy).not.toHaveBeenCalled();
    });

    it("should do nothing when $gameData is null", () => {
      normalizeSpy.mockClear();

      setGameSettings({ startScore: 501, doubleOut: true, tripleOut: false });

      expect($gameData.get()).toBeNull();
      expect(normalizeSpy).not.toHaveBeenCalled();
    });

    it("should correctly apply multiple sequential settings updates without calling normalizeGameData", () => {
      setGameData(makeGameData());
      normalizeSpy.mockClear();

      setGameSettings({ startScore: 501, doubleOut: true, tripleOut: false }, 1);
      setGameSettings({ startScore: 301, doubleOut: false, tripleOut: true }, 1);

      expect($gameData.get()?.settings).toEqual({
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      });
      expect(normalizeSpy).not.toHaveBeenCalled();
    });

    it("should not call normalizeGameData when settings values are unchanged", () => {
      const data = makeGameData();
      setGameData(data);
      normalizeSpy.mockClear();

      setGameSettings(data.settings, data.id);

      expect(normalizeSpy).not.toHaveBeenCalled();
    });
  });
});
