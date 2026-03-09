import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import {
  applyOptimisticThrow,
  applyOptimisticUndo,
  applyScoreboardDeltaToGameState,
} from "./throwStateService";

function buildGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
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

describe("throwStateService", () => {
  it("applies optimistic undo by restoring the removed throw score", () => {
    const gameState = buildGameData({
      currentThrowCount: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 250,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 20, isDouble: false, isTriple: false, isBust: false },
            { value: 31, isDouble: false, isTriple: false, isBust: false },
          ],
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

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.currentThrowCount).toBe(1);
    expect(nextState?.players[0]?.score).toBe(281);
    expect(nextState?.players[0]?.throwsInCurrentRound).toBe(1);
    expect(nextState?.players[0]?.currentRoundThrows).toEqual([
      { value: 20, isDouble: false, isTriple: false, isBust: false },
    ]);
  });

  it("optimistically finishes a turn on the third throw and activates the next player", () => {
    const gameState = buildGameData({
      currentThrowCount: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 281,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 2,
          currentRoundThrows: [
            { value: 10, isDouble: false, isTriple: false, isBust: false },
            { value: 10, isDouble: false, isTriple: false, isBust: false },
          ],
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

    const nextState = applyOptimisticThrow(gameState, {
      value: 20,
      isDouble: false,
      isTriple: false,
    });

    expect(nextState?.activePlayerId).toBe(2);
    expect(nextState?.currentThrowCount).toBe(0);
    expect(nextState?.players[0]?.currentRoundThrows).toEqual([]);
    expect(nextState?.players[0]?.throwsInCurrentRound).toBe(0);
    expect(nextState?.players[0]?.roundHistory).toHaveLength(1);
    expect(nextState?.players[1]?.isActive).toBe(true);
  });

  it("reconciles scoreboard delta by finalizing the previous active player turn", () => {
    const gameState = buildGameData({
      currentRound: 7,
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 281,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
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

    const nextState = applyScoreboardDeltaToGameState(gameState, {
      changedPlayers: [
        {
          playerId: 1,
          name: "P1",
          score: 281,
          position: null,
          isActive: false,
          isGuest: false,
          isBust: false,
        },
        {
          playerId: 2,
          name: "P2",
          score: 301,
          position: null,
          isActive: true,
          isGuest: false,
          isBust: false,
        },
      ],
      winnerId: null,
      status: "started",
      currentRound: 7,
    });

    expect(nextState.activePlayerId).toBe(2);
    expect(nextState.currentThrowCount).toBe(0);
    expect(nextState.players[0]?.currentRoundThrows).toEqual([]);
    expect(nextState.players[0]?.throwsInCurrentRound).toBe(0);
    expect(nextState.players[0]?.roundHistory).toEqual([
      {
        round: 7,
        throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
      },
    ]);
  });
});
