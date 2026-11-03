// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/shared/api/game";
import { applyScoreboardDelta } from "./optimisticThrow.logic";

type GamePlayer = GameThrowsResponse["players"][number];

function buildDeltaPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
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

function buildDeltaGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
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
      buildDeltaPlayer({
        id: 1,
        name: "Alice",
        score: 301,
        isActive: true,
        position: 0,
        placement: null,
        throwsInCurrentRound: 2,
      }),
      buildDeltaPlayer({
        id: 2,
        name: "Bob",
        score: 401,
        position: 1,
      }),
    ],
    ...overrides,
  };
}

const mockDeltaGameData = buildDeltaGameData();

describe("applyScoreboardDelta", () => {
  it("keeps a player's position when the delta omits it", () => {
    const nextGameData = applyScoreboardDelta(mockDeltaGameData, {
      changedPlayers: [{ playerId: 2, name: "Bob", score: 341, isActive: true, isGuest: false }],
      winnerId: null,
      status: "started",
      currentRound: 3,
    });

    expect(nextGameData.players[1]?.position).toBe(1);
  });

  it("clears a player's position when the delta sets it to null", () => {
    const nextGameData = applyScoreboardDelta(mockDeltaGameData, {
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
    const [firstPlayer, secondPlayer] = mockDeltaGameData.players;

    if (firstPlayer === undefined || secondPlayer === undefined) {
      throw new Error("Expected mockDeltaGameData.players to include two players.");
    }

    const currentGameData: GameThrowsResponse = {
      ...mockDeltaGameData,
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
      applyScoreboardDelta(currentGameData, {
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
      ...mockDeltaGameData,
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
