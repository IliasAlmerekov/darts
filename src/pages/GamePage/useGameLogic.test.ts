// @vitest-environment node
import { describe, expect, it } from "vitest";
import { areAllPlayersAtStartScore, shouldAutoFinishGame } from "./useGameLogic";
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
        isGuest: false,
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
        isGuest: false,
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
          isGuest: false,
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
          isGuest: false,
        },
      ],
    });

    expect(areAllPlayersAtStartScore(data)).toBe(false);
  });
});

describe("shouldAutoFinishGame", () => {
  it("should return false when game data is missing", () => {
    expect(shouldAutoFinishGame(null)).toBe(false);
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
        },
      ],
    });

    expect(shouldAutoFinishGame(data)).toBe(true);
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
          isGuest: false,
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
          isGuest: false,
        },
      ],
    });

    expect(shouldAutoFinishGame(data)).toBe(false);
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
          isGuest: false,
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
          isGuest: false,
        },
      ],
    });

    expect(shouldAutoFinishGame(data)).toBe(true);
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
          roundHistory: [
            { throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }] },
          ],
          isGuest: false,
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
