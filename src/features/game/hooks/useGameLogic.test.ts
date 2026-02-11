import { describe, expect, it } from "vitest";
import { areAllPlayersAtStartScore, shouldAutoFinishGame, shouldNavigateToSummary } from "./useGameLogic";
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

describe("shouldAutoFinishGame", () => {
  it("returns false when game data is missing", () => {
    expect(shouldAutoFinishGame(null, false)).toBe(false);
  });

  it("returns false when finish overlay is visible", () => {
    const data = buildGameData({
      currentRound: 3,
      players: [
        {
          id: 1,
          name: "P1",
          score: 26,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
        {
          id: 2,
          name: "P2",
          score: 0,
          isActive: false,
          isBust: false,
          position: 1,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
      ],
    });

    expect(shouldAutoFinishGame(data, true)).toBe(false);
  });

  it("returns true when exactly one active player remains in progressed started game", () => {
    const data = buildGameData({
      currentRound: 4,
      players: [
        {
          id: 1,
          name: "P1",
          score: 26,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
        {
          id: 2,
          name: "P2",
          score: 0,
          isActive: false,
          isBust: false,
          position: 1,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
      ],
    });

    expect(shouldAutoFinishGame(data, false)).toBe(true);
  });

  it("returns false when no players have finished yet", () => {
    const data = buildGameData({
      players: [
        {
          id: 1,
          name: "P1",
          score: 301,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 250,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    expect(shouldAutoFinishGame(data, false)).toBe(false);
  });

  it("returns true even when status is reopen-like, as long as only one active player remains", () => {
    const data = buildGameData({
      status: "reopened",
      players: [
        {
          id: 1,
          name: "P1",
          score: 26,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 0,
          isActive: false,
          isBust: false,
          position: 1,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    expect(shouldAutoFinishGame(data, false)).toBe(true);
  });
});

describe("shouldNavigateToSummary", () => {
  it("returns true for finished game even when winnerId is null", () => {
    const data = buildGameData({
      id: 559,
      status: "finished",
      currentRound: 1,
      winnerId: null,
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(true);
  });

  it("returns false when game id does not match route id", () => {
    const data = buildGameData({
      id: 560,
      status: "finished",
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(false);
  });

  it("returns false when game is not finished", () => {
    const data = buildGameData({
      id: 559,
      status: "started",
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(false);
  });
});
