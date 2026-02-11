import { describe, it, expect, beforeEach } from "vitest";
import {
  $gameData,
  $isLoading,
  $error,
  $activePlayer,
  $currentRound,
  $currentThrowCount,
  $isGameFinished,
  $winnerId,
  deriveWinnerId,
  normalizeGameData,
  setGameData,
  setLoading,
  setError,
  resetGameStore,
} from "./game";
import type { GameThrowsResponse } from "@/types";

const mockGameData: GameThrowsResponse = {
  id: 1,
  activePlayerId: 1,
  currentRound: 3,
  currentThrowCount: 2,
  status: "playing",
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

describe("game store", () => {
  beforeEach(() => {
    resetGameStore();
  });

  describe("setGameData", () => {
    it("should set game data and clear error", () => {
      setError(new Error("previous error"));
      setGameData(mockGameData);

      expect($gameData.get()).toEqual(mockGameData);
      expect($error.get()).toBeNull();
    });

    it("should handle null game data", () => {
      setGameData(mockGameData);
      setGameData(null);

      expect($gameData.get()).toBeNull();
    });

    it("should derive winnerId for finished game with one remaining active player", () => {
      setGameData({
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0],
            score: 26,
            isActive: true,
            position: 0,
          },
          {
            ...mockGameData.players[1],
            score: 0,
            isActive: false,
            position: 1,
          },
        ],
      });

      expect($winnerId.get()).toBe(1);
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
    });
  });

  describe("computed: $activePlayer", () => {
    it("should return active player when game data exists", () => {
      setGameData(mockGameData);

      const activePlayer = $activePlayer.get();

      expect(activePlayer).toEqual(mockGameData.players[0]);
    });

    it("should return null when no game data", () => {
      expect($activePlayer.get()).toBeNull();
    });

    it("should return null when active player not found", () => {
      const dataWithInvalidActivePlayer = {
        ...mockGameData,
        activePlayerId: 999,
      };
      setGameData(dataWithInvalidActivePlayer);

      expect($activePlayer.get()).toBeNull();
    });
  });

  describe("computed: $currentRound", () => {
    it("should return current round from game data", () => {
      setGameData(mockGameData);
      expect($currentRound.get()).toBe(3);
    });

    it("should return 1 when no game data", () => {
      expect($currentRound.get()).toBe(1);
    });
  });

  describe("computed: $currentThrowCount", () => {
    it("should return throw count from game data", () => {
      setGameData(mockGameData);
      expect($currentThrowCount.get()).toBe(2);
    });

    it("should return 0 when no game data", () => {
      expect($currentThrowCount.get()).toBe(0);
    });
  });

  describe("computed: $isGameFinished", () => {
    it("should return false when game is playing", () => {
      setGameData(mockGameData);
      expect($isGameFinished.get()).toBe(false);
    });

    it("should return true when game is finished", () => {
      setGameData({ ...mockGameData, status: "finished" });
      expect($isGameFinished.get()).toBe(true);
    });

    it("should return false when no game data", () => {
      expect($isGameFinished.get()).toBe(false);
    });
  });

  describe("computed: $winnerId", () => {
    it("should return null when no winner", () => {
      setGameData(mockGameData);
      expect($winnerId.get()).toBeNull();
    });

    it("should return winner id when game finished", () => {
      setGameData({
        ...mockGameData,
        status: "finished",
        winnerId: 1,
      });
      expect($winnerId.get()).toBe(1);
    });

    it("should return null when no game data", () => {
      expect($winnerId.get()).toBeNull();
    });
  });

  describe("deriveWinnerId", () => {
    it("returns existing winnerId when provided", () => {
      const gameData = {
        ...mockGameData,
        status: "finished",
        winnerId: 2,
      };

      expect(deriveWinnerId(gameData)).toBe(2);
    });

    it("returns winner by score when exactly one player has score > 0", () => {
      const gameData = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0],
            score: 26,
            isActive: false,
            position: 0,
          },
          {
            ...mockGameData.players[1],
            score: 0,
            isActive: false,
            position: 1,
          },
        ],
      };

      expect(deriveWinnerId(gameData)).toBe(1);
    });
  });

  describe("normalizeGameData", () => {
    it("keeps null as null", () => {
      expect(normalizeGameData(null)).toBeNull();
    });

    it("fills winnerId for finished game when derivable", () => {
      const gameData = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0],
            score: 20,
            isActive: true,
            position: 0,
          },
          {
            ...mockGameData.players[1],
            score: 0,
            isActive: false,
            position: 1,
          },
        ],
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.winnerId).toBe(1);
    });
  });
});
