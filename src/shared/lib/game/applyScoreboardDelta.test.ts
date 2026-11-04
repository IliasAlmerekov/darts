// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/shared/api/game";
import { applyScoreboardDelta } from "./applyScoreboardDelta";

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
      changedPlayers: [
        { playerId: 2, name: "Bob", score: 341, isActive: true, isGuest: false, isBust: null },
      ],
      winnerId: null,
      status: "started",
      currentRound: 3,
    });

    expect(nextGameData.players[1]?.position).toBe(1);
  });

  it.each([
    ["keeps the bust flag when the delta's isBust is null", null, true],
    ["takes the delta's isBust when it is a boolean", false, false],
  ])("%s", (_label, isBust, expected) => {
    const state = buildDeltaGameData({
      players: [buildDeltaPlayer({ id: 2, name: "Bob", isBust: true })],
    });

    const nextGameData = applyScoreboardDelta(state, {
      changedPlayers: [
        { playerId: 2, name: "Bob", score: 341, isActive: true, isGuest: false, isBust },
      ],
      winnerId: null,
      status: "started",
      currentRound: 3,
    });

    expect(nextGameData.players[0]?.isBust).toBe(expected);
  });

  it("clears a player's position when the delta sets it to null", () => {
    const nextGameData = applyScoreboardDelta(mockDeltaGameData, {
      changedPlayers: [
        {
          playerId: 2,
          name: "Bob",
          score: 341,
          position: null,
          isActive: true,
          isGuest: false,
          isBust: null,
        },
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

it.each([undefined, null, 2])(
  "applies placement %s without changing turn position",
  (placement) => {
    const state = buildDeltaGameData({
      players: [buildDeltaPlayer({ id: 1, position: 0, placement: 1, isActive: true })],
    });
    const delta = {
      changedPlayers: [
        {
          playerId: 1,
          name: "Alice",
          score: 0,
          isActive: true,
          isGuest: false,
          isBust: null,
          ...(placement === undefined ? {} : { placement }),
        },
      ],
      currentRound: 3,
      status: "started" as const,
      winnerId: null,
    };
    const result = applyScoreboardDelta(state, delta);
    expect(result.players[0]).toMatchObject({
      position: 0,
      placement: placement === undefined ? 1 : placement,
    });
    const changed = applyScoreboardDelta(result, {
      ...delta,
      changedPlayers: [
        {
          playerId: 1,
          name: "Alice",
          score: 0,
          isActive: true,
          isGuest: false,
          isBust: null,
          placement: 3,
        },
      ],
    });
    expect(changed.players[0]).toMatchObject({ position: 0, placement: 3 });
  },
);
