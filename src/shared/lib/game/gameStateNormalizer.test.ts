// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import {
  applyGameScoreboardDelta,
  deriveActivePlayerId,
  deriveWinnerId,
  normalizeGameData,
} from "./gameStateNormalizer";

type GamePlayer = GameThrowsResponse["players"][number];

function buildPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    id: 1,
    name: "Player",
    score: 501,
    isActive: false,
    position: null,
    isBust: false,
    throwsInCurrentRound: 0,
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
      buildPlayer({
        id: 1,
        name: "Alice",
        score: 301,
        isActive: true,
        position: 0,
        throwsInCurrentRound: 2,
      }),
      buildPlayer({
        id: 2,
        name: "Bob",
        score: 401,
        position: 1,
      }),
    ],
    ...overrides,
  };
}

const mockGameData = buildGameData();

describe("gameStateNormalizer", () => {
  describe("deriveActivePlayerId", () => {
    it("should return the only player with active flag when activePlayerId is missing", () => {
      expect(deriveActivePlayerId({ ...mockGameData, activePlayerId: null })).toBe(1);
    });

    it("should prefer the only active player flag when activePlayerId points to another player", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: 1,
        players: [
          {
            ...firstPlayer,
            isActive: false,
          },
          {
            ...secondPlayer,
            isActive: true,
          },
        ],
      };

      expect(deriveActivePlayerId(gameData)).toBe(2);
    });

    it("should derive the player with current throws when all active flags are false", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: null,
        players: [
          {
            ...firstPlayer,
            isActive: false,
            currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            throwsInCurrentRound: 1,
          },
          {
            ...secondPlayer,
            isActive: false,
          },
        ],
      };

      expect(deriveActivePlayerId(gameData)).toBe(1);
    });
  });

  describe("deriveWinnerId", () => {
    it("should return existing winnerId when winnerId is provided", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: 2,
      };

      expect(deriveWinnerId(gameData)).toBe(2);
    });

    it("should return winner by score when exactly one player has score > 0", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...firstPlayer,
            score: 26,
            isActive: false,
            position: 0,
          },
          {
            ...secondPlayer,
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
    it("should keep null as null when game data is missing", () => {
      expect(normalizeGameData(null)).toBeNull();
    });

    it("should normalize player active flags to match the derived active player when flags are stale", () => {
      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: null,
        players: mockGameData.players.map((player) => ({
          ...player,
          isActive: false,
        })),
      };
      const [firstPlayer] = gameData.players;

      if (firstPlayer === undefined) {
        throw new Error("Expected gameData.players to include the first player.");
      }

      gameData.players[0] = {
        ...firstPlayer,
        currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
        throwsInCurrentRound: 1,
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.activePlayerId).toBe(1);
      expect(normalized?.players[0]?.isActive).toBe(true);
      expect(normalized?.players[1]?.isActive).toBe(false);
    });

    it("should reconcile conflicting activePlayerId with the only active player flag when active markers disagree", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const gameData: GameThrowsResponse = {
        ...mockGameData,
        activePlayerId: 1,
        players: [
          {
            ...firstPlayer,
            isActive: false,
          },
          {
            ...secondPlayer,
            isActive: true,
          },
        ],
      };

      const normalized = normalizeGameData(gameData);

      expect(normalized?.activePlayerId).toBe(2);
      expect(normalized?.players[0]?.isActive).toBe(false);
      expect(normalized?.players[1]?.isActive).toBe(true);
    });

    it("should fill winnerId for finished game when winner can be derived", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const gameData: GameThrowsResponse = {
        ...mockGameData,
        status: "finished",
        winnerId: null,
        players: [
          {
            ...firstPlayer,
            score: 20,
            isActive: true,
            position: 0,
          },
          {
            ...secondPlayer,
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
    it("should apply scoreboard changes and recompute the active player when the delta updates the turn", () => {
      const [firstPlayer, secondPlayer] = mockGameData.players;

      if (firstPlayer === undefined || secondPlayer === undefined) {
        throw new Error("Expected mockGameData.players to include two players.");
      }

      const currentGameData: GameThrowsResponse = {
        ...mockGameData,
        currentRound: 5,
        currentThrowCount: 2,
        players: [
          {
            ...firstPlayer,
            score: 40,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...secondPlayer,
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
            ...firstPlayer,
            score: 60,
            isActive: false,
            position: null,
            throwsInCurrentRound: 2,
            currentRoundThrows: [{ value: 20 }, { value: 20 }],
          },
          {
            ...secondPlayer,
            score: 101,
            isActive: true,
            position: 1,
          },
        ],
      });
    });
  });
});
