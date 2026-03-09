// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  $gameData,
  $isLoading,
  $error,
  deriveWinnerId,
  normalizeGameData,
  setGameData,
  setLoading,
  setError,
  resetGameStore,
} from "./game-state";
import type { GameThrowsResponse } from "@/types";

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

describe("game-state store", () => {
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

  describe("deriveWinnerId", () => {
    it("returns existing winnerId when provided", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: 2,
      };

      expect(deriveWinnerId(gameData)).toBe(2);
    });

    it("returns winner by score when exactly one player has score > 0", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0]!,
            score: 26,
            isActive: false,
            position: 0,
          },
          {
            ...mockGameData.players[1]!,
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

    it("derives activePlayerId from a single active player flag when server returns null", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: null,
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.activePlayerId).toBe(1);
      expect(normalized?.players[0]?.isActive).toBe(true);
      expect(normalized?.players[1]?.isActive).toBe(false);
    });

    it("normalizes player active flags to match the derived active player", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: null,
        players: mockGameData.players.map((player) => ({
          ...player,
          isActive: false,
        })),
      };
      gameData.players[0] = {
        ...gameData.players[0]!,
        currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        throwsInCurrentRound: 1,
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.activePlayerId).toBe(1);
      expect(normalized?.players[0]?.isActive).toBe(true);
      expect(normalized?.players[1]?.isActive).toBe(false);
    });

    it("fills winnerId for finished game when derivable", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...mockGameData.players[0]!,
            score: 20,
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
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.winnerId).toBe(1);
    });
  });
});
