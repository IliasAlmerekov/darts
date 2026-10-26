// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameThrowsResponse } from "@/types";
import {
  createGameSession,
  enqueueThrow,
  enqueueUndo,
  getSessionView,
  getShownGame,
  type GameSession,
} from "./gameSession.logic";
import {
  appendDismissedPlayerIds,
  buildGamePlayersDerivedState,
  filterDismissedPlayerIds,
} from "./gamePlayersState.logic";

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

function buildUndoStateFromSession(session: GameSession) {
  return buildGamePlayersDerivedState({
    dismissedZeroScorePlayerIds: [],
    gameData: getShownGame(session),
    hasError: false,
    isLoading: false,
    canThrow: getSessionView(session).canThrow,
    canUndo: getSessionView(session).canUndo,
    skipFinishOverlay: false,
  });
}

function enqueueThrows(session: GameSession, values: (string | number)[]): GameSession {
  return values.reduce<GameSession>((current, value) => {
    const next = enqueueThrow(current, value);
    if (next === null) {
      throw new Error(`Throw ${value} was not accepted`);
    }
    return next;
  }, session);
}

describe("appendDismissedPlayerIds", () => {
  it("should deduplicate existing and new dismissed ids when merging two id lists", () => {
    expect(appendDismissedPlayerIds([2], [2, 3])).toEqual([2, 3]);
  });
});

describe("filterDismissedPlayerIds", () => {
  it("should keep only ids that still belong to zero-score players when filtering stale dismissals", () => {
    expect(filterDismissedPlayerIds([2, 3], [3, 4])).toEqual([3]);
  });

  it("should preserve the previous array reference when filtering changes nothing", () => {
    const previousIds = [3];

    expect(filterDismissedPlayerIds(previousIds, [3, 4])).toBe(previousIds);
  });
});

describe("buildGamePlayersDerivedState", () => {
  it("should derive active and finished players plus overlay visibility when game has a finished player", () => {
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

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      canThrow: true,
      canUndo: true,
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
      canThrow: true,
      canUndo: true,
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
      canThrow: true,
      canUndo: true,
      skipFinishOverlay: false,
    });

    expect(result.isInteractionDisabled).toBe(true);
    expect(result.isUndoDisabled).toBe(true);
  });

  it("should disable throw input but keep undo when the session refuses throws", () => {
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
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      canThrow: false,
      canUndo: true,
      skipFinishOverlay: false,
    });

    expect(result.isInteractionDisabled).toBe(true);
    expect(result.isUndoDisabled).toBe(false);
  });

  it("should enable undo when the session takes undo and game has throws", () => {
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
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      canThrow: true,
      canUndo: true,
      skipFinishOverlay: false,
    });

    expect(result.isUndoDisabled).toBe(false);
  });

  it("should disable undo when the session refuses undo", () => {
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
          currentRoundThrows: [{ value: 21, isDouble: false, isTriple: false, isBust: false }],
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

    const result = buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds: [],
      gameData,
      hasError: false,
      isLoading: false,
      canThrow: true,
      canUndo: false,
      skipFinishOverlay: false,
    });

    expect(result.isUndoDisabled).toBe(true);
    expect(result.isInteractionDisabled).toBe(false);
  });

  it("should enable undo when one miss is the only throw in history", () => {
    const session = enqueueThrows(createGameSession(buildGameData()), [0]);

    const result = buildUndoStateFromSession(session);

    expect(getShownGame(session)?.players.map((player) => player.score)).toEqual([301, 301]);
    expect(result.isUndoDisabled).toBe(false);
  });

  it("should enable undo when three misses end a turn at the start score", () => {
    const session = enqueueThrows(createGameSession(buildGameData()), [0, 0, 0]);

    const result = buildUndoStateFromSession(session);

    expect(getShownGame(session)?.players.map((player) => player.score)).toEqual([301, 301]);
    expect(result.isUndoDisabled).toBe(false);
  });

  it("should enable undo when a bust from the start score restores the start score", () => {
    const base = buildGameData();
    const session = enqueueThrows(
      createGameSession({
        ...base,
        settings: { startScore: 101, doubleOut: false, tripleOut: false },
        players: base.players.map((player) => ({ ...player, score: 101 })),
      }),
      ["T20", "T20"],
    );

    const result = buildUndoStateFromSession(session);

    expect(getShownGame(session)?.players.map((player) => player.score)).toEqual([101, 101]);
    expect(result.isUndoDisabled).toBe(false);
  });

  it("should disable undo when no player has a throw in history", () => {
    const result = buildUndoStateFromSession(createGameSession(buildGameData()));

    expect(result.isUndoDisabled).toBe(true);
  });

  it("should enable undo while a miss is queued and disable it again after undoing the miss", () => {
    const queued = enqueueThrows(createGameSession(buildGameData()), [0]);
    expect(queued.pending).toHaveLength(1);
    expect(buildUndoStateFromSession(queued).isUndoDisabled).toBe(false);

    const undone = enqueueUndo(queued);

    expect(undone.pending).toHaveLength(0);
    expect(buildUndoStateFromSession(undone).isUndoDisabled).toBe(true);
  });
});
