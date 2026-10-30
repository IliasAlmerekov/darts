// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/shared/api/game";
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
    placement: null,
    isBust: false,
    isGuest: false,
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
        placement: null,
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
    it("keeps a player's position when the delta omits it", () => {
      const nextGameData = applyGameScoreboardDelta(mockGameData, {
        changedPlayers: [{ playerId: 2, name: "Bob", score: 341, isActive: true, isGuest: false }],
        winnerId: null,
        status: "started",
        currentRound: 3,
      });

      expect(nextGameData.players[1]?.position).toBe(1);
    });

    it("clears a player's position when the delta sets it to null", () => {
      const nextGameData = applyGameScoreboardDelta(mockGameData, {
        changedPlayers: [
          { playerId: 2, name: "Bob", score: 341, position: null, isActive: true, isGuest: false },
        ],
        winnerId: null,
        status: "started",
        currentRound: 3,
      });

      expect(nextGameData.players[1]?.position).toBeNull();
    });

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
            currentRoundThrows: [
              { value: 20, isDouble: false, isTriple: false, isBust: false },
              { value: 20, isDouble: false, isTriple: false, isBust: false },
            ],
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
            placement: null,
            throwsInCurrentRound: 2,
            currentRoundThrows: [
              { value: 20, isDouble: false, isTriple: false, isBust: false },
              { value: 20, isDouble: false, isTriple: false, isBust: false },
            ],
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

describe("placement in scoreboard deltas", () => {
  it.each([undefined, null, 2])(
    "applies placement %s while preserving the turn position",
    (placement) => {
      const state = buildGameData({ players: [buildPlayer({ id: 1, position: 0, placement: 1 })] });
      const delta = {
        changedPlayers: [
          {
            playerId: 1,
            name: "Alice",
            score: 0,
            isActive: true,
            isGuest: false,
            ...(placement === undefined ? {} : { placement }),
          },
        ],
        currentRound: 3,
        status: "started" as const,
        winnerId: null,
      };
      const next = applyGameScoreboardDelta(state, delta);
      expect(next.players[0]).toMatchObject({
        position: 0,
        placement: placement === undefined ? 1 : placement,
      });
      const changed = applyGameScoreboardDelta(next, {
        ...delta,
        changedPlayers: [
          {
            ...delta.changedPlayers[0],
            playerId: 1,
            name: "Alice",
            score: 0,
            isActive: true,
            isGuest: false,
            placement: 3,
          },
        ],
      });
      expect(changed.players[0]).toMatchObject({ position: 0, placement: 3 });
    },
  );
});

describe("placement fallbacks", () => {
  it("finds the winner by placement even when the winner sat second", () => {
    const state = buildGameData({
      status: "finished",
      winnerId: null,
      activePlayerId: null,
      players: [
        buildPlayer({ id: 1, position: 0, placement: 2, score: 0, isActive: false }),
        buildPlayer({ id: 2, position: 1, placement: 1, score: 0, isActive: false }),
      ],
    });
    expect(deriveWinnerId(state)).toBe(2);
  });

  it("does not infer a winner from the first lobby seat or an open placement", () => {
    const state = buildGameData({
      status: "finished",
      winnerId: null,
      activePlayerId: null,
      players: [
        buildPlayer({ id: 1, position: 0, placement: 2, score: 0, isActive: false }),
        buildPlayer({ id: 2, position: 1, placement: null, score: 0, isActive: false }),
      ],
    });
    expect(deriveWinnerId(state)).toBeNull();
  });
});
