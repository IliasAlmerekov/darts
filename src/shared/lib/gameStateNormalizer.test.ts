// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import {
  applyGameScoreboardDelta,
  deriveActivePlayerId,
  deriveWinnerId,
  normalizeGameData,
} from "./gameStateNormalizer";

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

describe("gameStateNormalizer", () => {
  describe("deriveActivePlayerId", () => {
    it("returns the only player with active flag when activePlayerId is missing", () => {
      expect(deriveActivePlayerId({ ...mockGameData, activePlayerId: null })).toBe(1);
    });

    it("prefers the only active player flag when activePlayerId points to another player", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: 1,
        players: [
          {
            ...mockGameData.players[0]!,
            isActive: false,
          },
          {
            ...mockGameData.players[1]!,
            isActive: true,
          },
        ],
      };

      expect(deriveActivePlayerId(gameData)).toBe(2);
    });

    it("derives the player with current throws when all active flags are false", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: null,
        players: [
          {
            ...mockGameData.players[0]!,
            isActive: false,
            currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            throwsInCurrentRound: 1,
          },
          {
            ...mockGameData.players[1]!,
            isActive: false,
          },
        ],
      };

      expect(deriveActivePlayerId(gameData)).toBe(1);
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

    it("reconciles conflicting activePlayerId with the only active player flag", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: 1,
        players: [
          {
            ...mockGameData.players[0]!,
            isActive: false,
          },
          {
            ...mockGameData.players[1]!,
            isActive: true,
          },
        ],
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.activePlayerId).toBe(2);
      expect(normalized?.players[0]?.isActive).toBe(false);
      expect(normalized?.players[1]?.isActive).toBe(true);
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

      expect(normalizeGameData(gameData)?.winnerId).toBe(1);
    });
  });

  describe("applyGameScoreboardDelta", () => {
    it("applies scoreboard changes and recomputes the active player", () => {
      const currentGameData: GameThrowsResponse = {
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
      };

      expect(
        applyGameScoreboardDelta(currentGameData, {
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
        }),
      ).toEqual({
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
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...mockGameData.players[1]!,
            score: 101,
            isActive: true,
            position: 1,
          },
        ],
      });
    });
  });
});
