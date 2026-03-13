import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import { mergeGameSettings } from "./mergeGameSettings";

function createGameData(): GameThrowsResponse {
  return {
    type: "full-state",
    id: 42,
    status: "started",
    currentRound: 3,
    activePlayerId: 7,
    currentThrowCount: 2,
    winnerId: null,
    players: [
      {
        id: 7,
        name: "P1",
        score: 181,
        isActive: true,
        isBust: false,
        position: null,
        throwsInCurrentRound: 2,
        currentRoundThrows: [{ value: 20 }, { value: 20, isDouble: true }],
        roundHistory: [],
      },
    ],
    settings: {
      startScore: 301,
      doubleOut: false,
      tripleOut: false,
    },
  };
}

describe("mergeGameSettings", () => {
  it("replaces only game settings and preserves the rest of the game state", () => {
    const gameData = createGameData();

    const result = mergeGameSettings(gameData, {
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    expect(result).toEqual({
      ...gameData,
      settings: {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
    });
  });

  it("returns null when there is no active game state to merge into", () => {
    const result = mergeGameSettings(null, {
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    expect(result).toBeNull();
  });

  it("returns null when the current store game does not match the expected route game", () => {
    const result = mergeGameSettings(
      createGameData(),
      {
        startScore: 501,
        doubleOut: true,
        tripleOut: false,
      },
      99,
    );

    expect(result).toBeNull();
  });
});
