// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  calculateShouldShowFinishOverlay,
  hasThrowHistory,
  isLastActivePlayerLeft,
} from "./lib/gameLogic.helpers";
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

describe("hasThrowHistory", () => {
  it("should return false when game data is missing", () => {
    expect(hasThrowHistory(null)).toBe(false);
  });

  it("should return false when no player has a throw", () => {
    expect(hasThrowHistory(buildGameData())).toBe(false);
  });

  it("should return true when a player has a throw in the current round", () => {
    const base = buildGameData();
    const data = buildGameData({
      players: base.players.map((player) =>
        player.id === 1
          ? {
              ...player,
              currentRoundThrows: [{ value: 0, isDouble: false, isTriple: false, isBust: false }],
            }
          : player,
      ),
    });

    expect(hasThrowHistory(data)).toBe(true);
  });

  it("should return true when a player has a finished round", () => {
    const base = buildGameData();
    const data = buildGameData({
      players: base.players.map((player) =>
        player.id === 2
          ? {
              ...player,
              roundHistory: [
                {
                  round: 1,
                  throws: [{ value: 0, isDouble: false, isTriple: false, isBust: false }],
                },
              ],
            }
          : player,
      ),
    });

    expect(hasThrowHistory(data)).toBe(true);
  });
});

describe("isLastActivePlayerLeft", () => {
  it("should return false when game data is missing", () => {
    expect(isLastActivePlayerLeft(null)).toBe(false);
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

    expect(isLastActivePlayerLeft(data)).toBe(true);
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

    expect(isLastActivePlayerLeft(data)).toBe(false);
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

    expect(isLastActivePlayerLeft(data)).toBe(true);
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

  it("should return false when only one active player is left", () => {
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
