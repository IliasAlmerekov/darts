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
import * as gameStateNormalizer from "../lib/game/gameStateNormalizer";
import type { GameSettingsResponse, GameThrowsResponse } from "@/types";

function buildGamePlayer(
  overrides: Partial<GameThrowsResponse["players"][number]> = {},
): GameThrowsResponse["players"][number] {
  return {
    id: 1,
    name: "Alice",
    score: 301,
    isActive: true,
    position: 0,
    isBust: false,
    throwsInCurrentRound: 2,
    roundHistory: [],
    currentRoundThrows: [],
    ...overrides,
  };
}

function buildGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
  return {
    type: "full-state",
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
      buildGamePlayer(),
      buildGamePlayer({
        id: 2,
        name: "Bob",
        score: 401,
        isActive: false,
        position: 1,
        throwsInCurrentRound: 0,
      }),
    ],
    ...overrides,
  };
}

const mockGameData = buildGameData();

function makeGameData(overrides?: Partial<GameThrowsResponse>): GameThrowsResponse {
  return buildGameData(overrides);
}

function getMockPlayer(index: number): GameThrowsResponse["players"][number] {
  const player = mockGameData.players[index];

  if (player === undefined) {
    throw new Error(`Expected mock player at index ${index}`);
  }

  return player;
}

function getCurrentGameData(): GameThrowsResponse {
  const gameData = $gameData.get();

  if (gameData === null) {
    throw new Error("Expected game data to be available in test");
  }

  return gameData;
}

describe("game-state store", () => {
  beforeEach(() => {
    resetGameStore();
  });

  describe("setGameData", () => {
    it("should set normalized game data and clear error when fresh game data arrives", () => {
      setError(new Error("previous error"));

      setGameData({
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...getMockPlayer(0),
            score: 26,
            isActive: true,
            position: 0,
          },
          {
            ...getMockPlayer(1),
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
            ...getMockPlayer(0),
            isActive: false,
            throwsInCurrentRound: 0,
            currentRoundThrows: [],
          },
          {
            ...getMockPlayer(1),
            isActive: true,
            position: null,
          },
        ],
      });

      expect($gameData.get()?.activePlayerId).toBe(2);
      expect($gameData.get()?.players[0]?.isActive).toBe(false);
      expect($gameData.get()?.players[1]?.isActive).toBe(true);
    });

    it("should handle null game data when the store is cleared", () => {
      setGameData(mockGameData);
      setGameData(null);

      expect($gameData.get()).toBeNull();
    });
  });

  describe("setGameSettings", () => {
    it("should update only the settings fragment when the active game matches the expected id", () => {
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

    it("should ignore settings updates when a different game id is provided", () => {
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

    it("should update cache only when $gameData is null and settings are received", () => {
      const settings: GameSettingsResponse = {
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      };

      setGameSettings(settings, 5);

      expect($gameData.get()).toBeNull();
      expect(getCachedGameSettings(5)).toEqual(settings);
    });

    it("should not write to cache a second time when called with identical settings for the same game", () => {
      setGameData(mockGameData);

      const settings1: GameSettingsResponse = {
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      };
      const settings2: GameSettingsResponse = {
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      };

      setGameSettings(settings1, 1);
      const cachedAfterFirst = getCachedGameSettings(1);

      setGameSettings(settings2, 1);
      const cachedAfterSecond = getCachedGameSettings(1);

      expect(cachedAfterFirst).toBe(settings1);
      expect(cachedAfterSecond).toBe(settings1);
    });

    it("should preserve an existing error when settings updates are not the error source", () => {
      setGameData(mockGameData);
      const error = new Error("existing error");
      setError(error);

      setGameSettings(
        {
          startScore: 301,
          doubleOut: false,
          tripleOut: true,
        },
        1,
      );

      expect($error.get()).toBe(error);
    });
  });

  describe("setGameScoreboardDelta", () => {
    it("should store the patched scoreboard state when the active game matches the expected id", () => {
      setGameData({
        ...mockGameData,
        currentRound: 5,
        currentThrowCount: 2,
        players: [
          {
            ...getMockPlayer(0),
            score: 40,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...getMockPlayer(1),
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
            ...getMockPlayer(0),
            score: 60,
            isActive: false,
            position: null,
            isBust: false,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...getMockPlayer(1),
            score: 101,
            isActive: true,
            position: 1,
            isBust: false,
          },
        ],
      });
      expect($error.get()).toBeNull();
    });

    it("should ignore scoreboard updates when a different game id is provided", () => {
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

    it("should apply scoreboard delta to the current game when no expectedGameId is provided", () => {
      setGameData(mockGameData);

      const result = setGameScoreboardDelta({
        changedPlayers: [],
        winnerId: null,
        status: "started",
        currentRound: 99,
      });

      expect(result).toBeUndefined();
      expect($gameData.get()?.currentRound).toBe(99);
      expect($error.get()).toBeNull();
    });

    it("should leave the store unchanged when $gameData is null", () => {
      const result = setGameScoreboardDelta({
        changedPlayers: [],
        winnerId: null,
        status: "started",
        currentRound: 1,
      });

      expect(result).toBeUndefined();
      expect($gameData.get()).toBeNull();
    });

    it("should preserve an existing error when scoreboard updates are not the error source", () => {
      setGameData(mockGameData);
      const error = new Error("existing error");
      setError(error);

      setGameScoreboardDelta(
        {
          changedPlayers: [],
          winnerId: null,
          status: "started",
          currentRound: 4,
        },
        1,
      );

      expect($error.get()).toBe(error);
    });
  });

  describe("setLoading", () => {
    it("should set loading state to true when loading starts", () => {
      setLoading(true);
      expect($isLoading.get()).toBe(true);
    });

    it("should set loading state to false when loading finishes", () => {
      setLoading(true);
      setLoading(false);
      expect($isLoading.get()).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error when an error is provided", () => {
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
    it("should reset all state to initial values when resetGameStore is called", () => {
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

  // --- TICKET-12 ---
  describe("getCachedGameSettings — TICKET-12 (N=1 cache)", () => {
    it("should store gameId and settings when setCachedGameSettings is called via setGameSettings", () => {
      const settings: GameSettingsResponse = { startScore: 501, doubleOut: true, tripleOut: false };

      setGameSettings(settings, 7);

      expect(getCachedGameSettings(7)).toEqual(settings);
    });

    it("should return settings when queried with a matching gameId", () => {
      setGameData(mockGameData);

      expect(getCachedGameSettings(mockGameData.id)).toEqual(mockGameData.settings);
    });

    it("should return null when queried with a different gameId", () => {
      setGameData(mockGameData);

      expect(getCachedGameSettings(mockGameData.id + 1)).toBeNull();
    });

    it("should retain only the last entry when setCachedGameSettings is called twice with different gameIds", () => {
      const settings1: GameSettingsResponse = {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      };
      const settings2: GameSettingsResponse = {
        startScore: 301,
        doubleOut: false,
        tripleOut: true,
      };

      setGameSettings(settings1, 10);
      setGameSettings(settings2, 20);

      expect(getCachedGameSettings(10)).toBeNull();
      expect(getCachedGameSettings(20)).toEqual(settings2);
    });

    it("should return null when resetGameStore clears the cache", () => {
      setGameSettings({ startScore: 501, doubleOut: true, tripleOut: false }, 3);

      resetGameStore();

      expect(getCachedGameSettings(3)).toBeNull();
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

    it("should not change players, activePlayerId and winnerId by reference when settings are updated", () => {
      setGameData(makeGameData());
      normalizeSpy.mockClear();

      const before = getCurrentGameData();
      setGameSettings({ startScore: 301, doubleOut: false, tripleOut: true }, before.id);
      const after = getCurrentGameData();

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

    it("should correctly apply multiple sequential settings updates when normalizeGameData is not called", () => {
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
