// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import {
  appendDismissedPlayerIds,
  buildGamePlayersDerivedState,
  filterDismissedPlayerIds,
} from "./gamePlayersState.logic";

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
        position: null,
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
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
      },
    ],
    ...overrides,
  };
}

describe("appendDismissedPlayerIds", () => {
  it("should deduplicate existing and new dismissed ids", () => {
    expect(appendDismissedPlayerIds([2], [2, 3])).toEqual([2, 3]);
  });
});

describe("filterDismissedPlayerIds", () => {
  it("should keep only ids that still belong to zero-score players", () => {
    expect(filterDismissedPlayerIds([2, 3], [3, 4])).toEqual([3]);
  });

  it("should preserve the previous array reference when filtering changes nothing", () => {
    const previousIds = [3];

    expect(filterDismissedPlayerIds(previousIds, [3, 4])).toBe(previousIds);
  });
});

describe("buildGamePlayersDerivedState", () => {
  it("should derive active and finished players plus overlay visibility", () => {
    const gameData = buildGameData({
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

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      isUndoPending: false,
      skipFinishOverlay: false,
    });

    expect(result.activePlayer?.id).toBe(1);
    expect(result.activePlayers.map((player) => player.id)).toEqual([1, 2]);
    expect(result.finishedPlayers.map((player) => player.id)).toEqual([3]);
    expect(result.zeroScorePlayerIds).toEqual([3]);
    expect(result.shouldShowFinishOverlay).toBe(true);
    expect(result.isInteractionDisabled).toBe(true);
    expect(result.isUndoDisabled).toBe(true);
  });

  it("should keep interaction enabled but disable undo when everyone is still on start score", () => {
    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData: buildGameData(),
      hasError: false,
      isLoading: false,
      isUndoPending: false,
      skipFinishOverlay: false,
    });

    expect(result.shouldShowFinishOverlay).toBe(false);
    expect(result.isInteractionDisabled).toBe(false);
    expect(result.isUndoDisabled).toBe(true);
  });

  it("should disable interaction when a page error is present", () => {
    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData: buildGameData(),
      hasError: true,
      isLoading: false,
      isUndoPending: false,
      skipFinishOverlay: false,
    });

    expect(result.isInteractionDisabled).toBe(true);
    expect(result.isUndoDisabled).toBe(true);
  });

  it("should disable undo when isUndoPending is true and game has throws", () => {
    const gameData = buildGameData({
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21 }],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      isUndoPending: true,
      skipFinishOverlay: false,
    });

    expect(result.isUndoDisabled).toBe(true);
  });

  it("should enable undo when isUndoPending is false and game has throws", () => {
    const gameData = buildGameData({
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21 }],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      isUndoPending: false,
      skipFinishOverlay: false,
    });

    expect(result.isUndoDisabled).toBe(false);
  });

  it("should disable undo when isUndoPending is true even if other conditions would enable it", () => {
    const gameData = buildGameData({
      players: [
        {
          id: 1,
          name: "P1",
          score: 280,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 21 }],
          roundHistory: [],
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: false,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
        },
      ],
    });

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      isUndoPending: true,
      skipFinishOverlay: false,
    });

    expect(result.isUndoDisabled).toBe(true);
    expect(result.isInteractionDisabled).toBe(false);
  });
});
