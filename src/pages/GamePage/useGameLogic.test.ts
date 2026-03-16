// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  areAllPlayersAtStartScore,
  shouldAutoFinishGame,
  shouldNavigateToSummary,
  parseGameIdParam,
} from "./useGameLogic";
import { calculateShouldShowFinishOverlay } from "./lib/gameLogic.helpers";
import type { GameThrowsResponse } from "@/types";

function buildGameData(overrides?: Partial<GameThrowsResponse>): GameThrowsResponse {
  return {
    type: "full-state",
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
  it("should return true when game data is missing", () => {
    expect(areAllPlayersAtStartScore(null)).toBe(true);
  });

  it("should return true when all players are on start score", () => {
    const data = buildGameData();
    expect(areAllPlayersAtStartScore(data)).toBe(true);
  });

  it("should return false when at least one player has changed score", () => {
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
  it("should return false when game data is missing", () => {
    expect(shouldAutoFinishGame(null, false)).toBe(false);
  });

  it("should return false when the finish overlay is visible", () => {
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

  it("should return true when exactly one active player remains in a progressed started game", () => {
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

  it("should return false when no players have finished yet", () => {
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

  it("should return true when the game is not finished and only one active player remains", () => {
    const data = buildGameData({
      status: "lobby",
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
  it("should return true for a finished game when winnerId is null", () => {
    const data = buildGameData({
      id: 559,
      status: "finished",
      currentRound: 1,
      winnerId: null,
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(true);
  });

  it("should return false when the game id does not match the route id", () => {
    const data = buildGameData({
      id: 560,
      status: "finished",
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(false);
  });

  it("should return false when the game is not finished", () => {
    const data = buildGameData({
      id: 559,
      status: "started",
    });

    expect(shouldNavigateToSummary(data, 559)).toBe(false);
  });
});

describe("calculateShouldShowFinishOverlay", () => {
  it("should return true when a player finished and more than one active player remains", () => {
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
          score: 40,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
        {
          id: 3,
          name: "P3",
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

    expect(
      calculateShouldShowFinishOverlay({
        gameData: data,
        dismissedZeroScorePlayerIds: [],
        skipFinishOverlay: false,
        zeroScorePlayerIds: [3],
      }),
    ).toBe(true);
  });

  it("should return false when the finished players were already dismissed", () => {
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
          score: 40,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [{ throws: [{ value: 20 }] }],
        },
        {
          id: 3,
          name: "P3",
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

    expect(
      calculateShouldShowFinishOverlay({
        gameData: data,
        dismissedZeroScorePlayerIds: [3],
        skipFinishOverlay: false,
        zeroScorePlayerIds: [3],
      }),
    ).toBe(false);
  });

  it("should return false when the game should auto-finish instead", () => {
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

    expect(
      calculateShouldShowFinishOverlay({
        gameData: data,
        dismissedZeroScorePlayerIds: [],
        skipFinishOverlay: false,
        zeroScorePlayerIds: [2],
      }),
    ).toBe(false);
  });
});

describe("parseGameIdParam", () => {
  it("should return null when gameIdParam is undefined", () => {
    expect(parseGameIdParam(undefined)).toBeNull();
  });

  it("should return null when gameIdParam is an empty string", () => {
    expect(parseGameIdParam("")).toBeNull();
  });

  it("should return null when gameIdParam is a non-numeric string", () => {
    expect(parseGameIdParam("abc")).toBeNull();
  });

  it("should return null when gameIdParam is Infinity", () => {
    expect(parseGameIdParam("Infinity")).toBeNull();
  });

  it("should return the parsed number when gameIdParam is a valid integer string", () => {
    expect(parseGameIdParam("42")).toBe(42);
  });

  it("should return the parsed number when gameIdParam is '1'", () => {
    expect(parseGameIdParam("1")).toBe(1);
  });
});
