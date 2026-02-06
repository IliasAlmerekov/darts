import { describe, expect, it } from "vitest";
import { areAllPlayersAtStartScore } from "./useGameLogic";
import type { GameThrowsResponse } from "../api";

function buildGameData(overrides?: Partial<GameThrowsResponse>): GameThrowsResponse {
  return {
    id: 1,
    status: "started",
    currentRound: 1,
    activePlayerId: 1,
    currentThrowCount: 0,
    winnerId: null,
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
    players: [
      {
        id: 1,
        name: "P1",
        score: 301,
        isActive: true,
        isBust: false,
        position: 1,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
      {
        id: 2,
        name: "P2",
        score: 301,
        isActive: false,
        isBust: false,
        position: 2,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
    ],
    ...overrides,
  };
}

describe("areAllPlayersAtStartScore", () => {
  it("returns true when game data is missing", () => {
    expect(areAllPlayersAtStartScore(null)).toBe(true);
  });

  it("returns true when all players are on start score", () => {
    const data = buildGameData();
    expect(areAllPlayersAtStartScore(data)).toBe(true);
  });

  it("returns false when at least one player has changed score", () => {
    const data = buildGameData({
      players: [
        {
          id: 1,
          name: "P1",
          score: 281,
          isActive: true,
          isBust: false,
          position: 1,
          throwsInCurrentRound: 1,
          currentRoundThrows: [],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: false,
          isBust: false,
          position: 2,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    expect(areAllPlayersAtStartScore(data)).toBe(false);
  });
});
