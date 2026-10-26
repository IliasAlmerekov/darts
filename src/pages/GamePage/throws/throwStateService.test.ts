// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse, PlayerThrow } from "@/types";
import {
  applyOptimisticThrow,
  applyOptimisticUndo,
  applyScoreboardDeltaToGameState,
} from "./throwStateService";

function buildGameData(overrides: Partial<GameThrowsResponse> = {}): GameThrowsResponse {
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
        position: null,
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
        position: null,
        throwsInCurrentRound: 0,
        currentRoundThrows: [],
        roundHistory: [],
        isGuest: false,
      },
    ],
    ...overrides,
  };
}

function buildGameDataWithFirstPlayerAtPosition(position: number): GameThrowsResponse {
  const gameState = buildGameData();
  const [firstPlayer, ...otherPlayers] = gameState.players;
  if (firstPlayer === undefined) {
    throw new Error("Expected buildGameData to include a player.");
  }
  return { ...gameState, players: [{ ...firstPlayer, position }, ...otherPlayers] };
}

function singleThrow(value: number): PlayerThrow {
  return { value, isDouble: false, isTriple: false, isBust: false };
}

function buildTurnState({
  rule,
  turnStartScore,
  priorThrowValues,
  activeIndex,
}: {
  rule: "single" | "double" | "triple";
  turnStartScore: number;
  priorThrowValues: readonly number[];
  activeIndex: 0 | 1;
}): GameThrowsResponse {
  const base = buildGameData();
  const priorThrows = priorThrowValues.map(singleThrow);
  const spent = priorThrowValues.reduce((sum, value) => sum + value, 0);
  const players = base.players.map((player, index) => {
    if (index !== activeIndex) {
      return { ...player, isActive: false, score: 100 };
    }
    return {
      ...player,
      isActive: true,
      score: turnStartScore - spent,
      throwsInCurrentRound: priorThrows.length,
      currentRoundThrows: priorThrows,
    };
  });
  const activePlayer = players[activeIndex];
  if (activePlayer === undefined) {
    throw new Error("Expected an active player.");
  }
  return {
    ...base,
    activePlayerId: activePlayer.id,
    currentThrowCount: priorThrows.length,
    settings: {
      startScore: 301,
      doubleOut: rule === "double",
      tripleOut: rule === "triple",
    },
    players,
  };
}

function expectBustAtTurnStart({
  gameState,
  nextState,
  activeIndex,
  turnStartScore,
  priorThrowValues,
  lastThrowValue,
}: {
  gameState: GameThrowsResponse;
  nextState: GameThrowsResponse | null;
  activeIndex: 0 | 1;
  turnStartScore: number;
  priorThrowValues: readonly number[];
  lastThrowValue: number;
}): void {
  const otherIndex = activeIndex === 0 ? 1 : 0;
  const wrapped = activeIndex === 1;
  const bustPlayer = nextState?.players[activeIndex];
  const roundHistory = bustPlayer?.roundHistory ?? [];
  const lastRound = roundHistory[roundHistory.length - 1];

  expect(bustPlayer?.score).toBe(turnStartScore);
  expect(bustPlayer?.isBust).toBe(true);
  expect(bustPlayer?.isActive).toBe(false);
  expect(bustPlayer?.currentRoundThrows).toEqual([]);
  expect(bustPlayer?.throwsInCurrentRound).toBe(0);
  expect(lastRound?.throws).toHaveLength(priorThrowValues.length + 1);
  expect(lastRound?.throws.at(-1)).toEqual({
    value: lastThrowValue,
    isDouble: false,
    isTriple: false,
    isBust: true,
  });
  expect(nextState?.activePlayerId).toBe(gameState.players[otherIndex]?.id);
  expect(nextState?.players[otherIndex]?.isActive).toBe(true);
  expect(nextState?.currentThrowCount).toBe(0);
  expect(nextState?.currentRound).toBe(gameState.currentRound + (wrapped ? 1 : 0));
}

describe("throwStateService", () => {
  it("should apply optimistic undo by restoring the removed throw score when the active player has throws in the current round", () => {
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
          isGuest: false,
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
          isGuest: false,
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

  it("should drop the undone throw from the current round in roundHistory as the server lists it there too", () => {
    const miss = { value: 0, isDouble: false, isTriple: false, isBust: false };
    const firstRound = {
      round: 1,
      throws: [
        { ...miss, value: 20 },
        { ...miss, value: 20 },
      ],
    };
    const gameState = buildGameData({
      currentRound: 2,
      currentThrowCount: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 261,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 1,
          currentRoundThrows: [miss],
          roundHistory: [firstRound, { round: 2, throws: [miss] }],
          isGuest: false,
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
          isGuest: false,
        },
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.players[0]?.currentRoundThrows).toEqual([]);
    expect(nextState?.players[0]?.roundHistory).toEqual([firstRound]);
  });

  it("should restore the previous player when undoing a completed winning throw", () => {
    const gameState = buildGameData({
      status: "started",
      currentRound: 3,
      currentThrowCount: 0,
      activePlayerId: 2,
      winnerId: 1,
      players: [
        {
          id: 1,
          name: "P1",
          score: 0,
          isActive: false,
          isBust: false,
          position: 1,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [
            {
              round: 3,
              throws: [{ value: 20, isDouble: false, isTriple: false, isBust: false }],
            },
          ],
          isGuest: false,
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
          isGuest: false,
        },
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.status).toBe("started");
    expect(nextState?.winnerId).toBeNull();
    expect(nextState?.activePlayerId).toBe(1);
    expect(nextState?.currentRound).toBe(3);
    expect(nextState?.currentThrowCount).toBe(0);
    expect(nextState?.players[0]?.score).toBe(20);
    expect(nextState?.players[0]?.position).toBeNull();
    expect(nextState?.players[0]?.isActive).toBe(true);
    expect(nextState?.players[0]?.roundHistory).toEqual([]);
  });

  it("should restore a completed bust turn to in-progress throws when undoing the bust throw", () => {
    const gameState = buildGameData({
      currentRound: 7,
      currentThrowCount: 0,
      activePlayerId: 2,
      players: [
        {
          id: 1,
          name: "P1",
          score: 101,
          isActive: false,
          isBust: true,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [
            {
              round: 7,
              throws: [
                { value: 20, isDouble: false, isTriple: false, isBust: false },
                { value: 20, isDouble: false, isTriple: false, isBust: false },
                { value: 70, isDouble: false, isTriple: false, isBust: true },
              ],
            },
          ],
          isGuest: false,
        },
        {
          id: 2,
          name: "P2",
          score: 301,
          isActive: true,
          isBust: false,
          position: null,
          throwsInCurrentRound: 0,
          currentRoundThrows: [],
          roundHistory: [],
          isGuest: false,
        },
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.activePlayerId).toBe(1);
    expect(nextState?.currentRound).toBe(7);
    expect(nextState?.currentThrowCount).toBe(2);
    expect(nextState?.players[0]?.score).toBe(61);
    expect(nextState?.players[0]?.isBust).toBe(false);
    expect(nextState?.players[0]?.throwsInCurrentRound).toBe(2);
    expect(nextState?.players[0]?.currentRoundThrows).toEqual([
      { value: 20, isDouble: false, isTriple: false, isBust: false },
      { value: 20, isDouble: false, isTriple: false, isBust: false },
    ]);
    expect(nextState?.players[0]?.roundHistory).toEqual([]);
  });

  it("should optimistically finish a turn and activate the next player when the third throw is applied", () => {
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
          isGuest: false,
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
          isGuest: false,
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

  it("should reconcile scoreboard delta by finalizing the previous active player turn when a turn change is received", () => {
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
          isGuest: false,
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
          isGuest: false,
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

  it("keeps a player's position when the scoreboard delta omits it", () => {
    const gameState = buildGameDataWithFirstPlayerAtPosition(2);

    const nextState = applyScoreboardDeltaToGameState(gameState, {
      changedPlayers: [{ playerId: 1, name: "P1", score: 281, isActive: true, isGuest: false }],
      winnerId: null,
      status: "started",
      currentRound: 1,
    });

    expect(nextState.players[0]?.position).toBe(2);
  });

  it("clears a player's position when the scoreboard delta sets it to null", () => {
    const gameState = buildGameDataWithFirstPlayerAtPosition(2);

    const nextState = applyScoreboardDeltaToGameState(gameState, {
      changedPlayers: [
        { playerId: 1, name: "P1", score: 281, position: null, isActive: true, isGuest: false },
      ],
      winnerId: null,
      status: "started",
      currentRound: 1,
    });

    expect(nextState.players[0]?.position).toBeNull();
  });

  describe("unreachable checkout remainders", () => {
    const dartCases = [
      { dart: 1, turnStartScore: 2, priorThrowValues: [] },
      { dart: 2, turnStartScore: 21, priorThrowValues: [19] },
      { dart: 3, turnStartScore: 40, priorThrowValues: [19, 19] },
    ] as const;
    const orderCases = [
      { order: "not last in order", activeIndex: 0 },
      { order: "last in order", activeIndex: 1 },
    ] as const;

    describe.each(dartCases)("double-out on dart $dart", (dartCase) => {
      it.each(orderCases)(
        "should bust and restore the turn start score when leaving 1 and the player is $order",
        ({ activeIndex }) => {
          const gameState = buildTurnState({ rule: "double", ...dartCase, activeIndex });

          const nextState = applyOptimisticThrow(gameState, {
            value: 1,
            isDouble: false,
            isTriple: false,
          });

          expectBustAtTurnStart({
            gameState,
            nextState,
            activeIndex,
            turnStartScore: dartCase.turnStartScore,
            priorThrowValues: dartCase.priorThrowValues,
            lastThrowValue: 1,
          });
        },
      );
    });

    describe.each([
      { left: 1, turnStartScore: 2 },
      { left: 2, turnStartScore: 3 },
    ])("triple-out leaving $left", ({ turnStartScore }) => {
      it.each(orderCases)(
        "should bust and restore the turn start score when the player is $order",
        ({ activeIndex }) => {
          const gameState = buildTurnState({
            rule: "triple",
            turnStartScore,
            priorThrowValues: [],
            activeIndex,
          });

          const nextState = applyOptimisticThrow(gameState, {
            value: 1,
            isDouble: false,
            isTriple: false,
          });

          expectBustAtTurnStart({
            gameState,
            nextState,
            activeIndex,
            turnStartScore,
            priorThrowValues: [],
            lastThrowValue: 1,
          });
        },
      );
    });

    it.each([
      { left: 1, turnStartScore: 2 },
      { left: 2, turnStartScore: 3 },
    ])(
      "should keep the player active with the reduced score when single-out leaves $left",
      ({ left, turnStartScore }) => {
        const gameState = buildTurnState({
          rule: "single",
          turnStartScore,
          priorThrowValues: [],
          activeIndex: 0,
        });

        const nextState = applyOptimisticThrow(gameState, {
          value: 1,
          isDouble: false,
          isTriple: false,
        });

        expect(nextState?.players[0]?.score).toBe(left);
        expect(nextState?.players[0]?.isActive).toBe(true);
        expect(nextState?.players[0]?.isBust).toBe(false);
        expect(nextState?.players[0]?.currentRoundThrows.at(-1)?.isBust).toBe(false);
        expect(nextState?.activePlayerId).toBe(gameState.activePlayerId);
      },
    );

    it("should finish the player when double-out ends on a double", () => {
      const gameState = buildTurnState({
        rule: "double",
        turnStartScore: 2,
        priorThrowValues: [],
        activeIndex: 0,
      });

      const nextState = applyOptimisticThrow(gameState, {
        value: 1,
        isDouble: true,
        isTriple: false,
      });

      expect(nextState?.players[0]?.score).toBe(0);
      expect(nextState?.players[0]?.isBust).toBe(false);
      expect(nextState?.players[0]?.position).toBe(1);
      expect(nextState?.activePlayerId).toBe(2);
    });

    it("should finish the player when triple-out ends on a triple", () => {
      const gameState = buildTurnState({
        rule: "triple",
        turnStartScore: 3,
        priorThrowValues: [],
        activeIndex: 0,
      });

      const nextState = applyOptimisticThrow(gameState, {
        value: 1,
        isDouble: false,
        isTriple: true,
      });

      expect(nextState?.players[0]?.score).toBe(0);
      expect(nextState?.players[0]?.isBust).toBe(false);
      expect(nextState?.players[0]?.position).toBe(1);
      expect(nextState?.activePlayerId).toBe(2);
    });
  });
});

describe("applyOptimisticUndo after a completed turn", () => {
  function turn(
    round: number,
    ...values: number[]
  ): GameThrowsResponse["players"][number]["roundHistory"][number] {
    return { round, throws: values.map(singleThrow) };
  }

  function seat(
    id: number,
    overrides: Partial<GameThrowsResponse["players"][number]>,
  ): GameThrowsResponse["players"][number] {
    return {
      id,
      name: `P${id}`,
      score: 200,
      isActive: false,
      isBust: false,
      position: null,
      throwsInCurrentRound: 0,
      currentRoundThrows: [],
      roundHistory: [],
      isGuest: false,
      ...overrides,
    };
  }

  it("should undo the latest turn and pass over a finished player that was skipped", () => {
    const gameState = buildGameData({
      currentRound: 3,
      activePlayerId: 3,
      players: [
        seat(1, { score: 100, roundHistory: [turn(1, 20), turn(2, 20), turn(3, 20, 20, 20)] }),
        seat(2, { score: 0, position: 1, roundHistory: [turn(1, 20, 20, 20)] }),
        seat(3, { score: 150, isActive: true, roundHistory: [turn(1, 20), turn(2, 20)] }),
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.activePlayerId).toBe(1);
    expect(nextState?.currentRound).toBe(3);
    expect(nextState?.players.map((player) => player.isActive)).toEqual([true, false, false]);
    expect(nextState?.players.map((player) => player.score)).toEqual([120, 0, 150]);
    expect(nextState?.players.map((player) => player.currentRoundThrows)).toEqual([
      [singleThrow(20), singleThrow(20)],
      [],
      [],
    ]);
    expect(nextState?.players.map((player) => player.roundHistory)).toEqual([
      [turn(1, 20), turn(2, 20)],
      [turn(1, 20, 20, 20)],
      [turn(1, 20), turn(2, 20)],
    ]);
  });

  it("should undo the last seat's turn of the previous round when the first seat is active", () => {
    const gameState = buildGameData({
      currentRound: 2,
      activePlayerId: 1,
      players: [
        seat(1, { isActive: true, roundHistory: [turn(1, 20)] }),
        seat(2, { roundHistory: [turn(1, 20)] }),
        seat(3, { score: 180, roundHistory: [turn(1, 20, 20)] }),
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.activePlayerId).toBe(3);
    expect(nextState?.currentRound).toBe(1);
    expect(nextState?.players[2]?.score).toBe(200);
    expect(nextState?.players[2]?.currentRoundThrows).toEqual([singleThrow(20)]);
    expect(nextState?.players[2]?.roundHistory).toEqual([]);
  });

  it("should pass over a later seat that finished before the previous round", () => {
    const gameState = buildGameData({
      currentRound: 3,
      activePlayerId: 1,
      players: [
        seat(1, { isActive: true, roundHistory: [turn(1, 20), turn(2, 20)] }),
        seat(2, { roundHistory: [turn(1, 20), turn(2, 20)] }),
        seat(3, { score: 180, roundHistory: [turn(1, 20), turn(2, 20, 20)] }),
        seat(4, { score: 0, position: 1, roundHistory: [turn(1, 20, 20, 20)] }),
      ],
    });

    const nextState = applyOptimisticUndo(gameState);

    expect(nextState?.activePlayerId).toBe(3);
    expect(nextState?.currentRound).toBe(2);
    expect(nextState?.players[3]?.roundHistory).toEqual([turn(1, 20, 20, 20)]);
    expect(nextState?.players[2]?.roundHistory).toEqual([turn(1, 20)]);
  });

  it("should return null when no player has a turn from the current or previous round", () => {
    const gameState = buildGameData({
      currentRound: 3,
      activePlayerId: 3,
      players: [
        seat(1, { roundHistory: [turn(1, 20)] }),
        seat(2, { roundHistory: [turn(1, 20)] }),
        seat(3, { isActive: true }),
      ],
    });

    expect(applyOptimisticUndo(gameState)).toBeNull();
  });
});
