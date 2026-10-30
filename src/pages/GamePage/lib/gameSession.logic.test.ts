// @vitest-environment node
import { describe, expect, expectTypeOf, it } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type {
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoAckResponse,
} from "@/shared/api/game";
import {
  applyReloadedGame,
  applyThrowAck,
  applyUndoResponse,
  createGameSession,
  failSession,
  markFirstLoadFailed,
  markSessionOffline,
  retrySession,
  takeNextOp,
  toThrowRequest,
  enqueueThrow,
  enqueueUndo,
  getSessionView,
  getShownGame,
  type GameSession,
} from "./gameSession.logic";

function buildGame(scores: { alice: number; bob: number }): GameThrowsResponse {
  return buildGameThrowsResponse({
    id: 4,
    settings: { startScore: 301, doubleOut: false, tripleOut: false },
    players: [
      buildBackendPlayer({ id: 1, name: "Alice", score: scores.alice, isActive: true }),
      buildBackendPlayer({ id: 2, name: "Bob", score: scores.bob }),
    ],
  });
}

function buildDelta(
  alice: number,
  bob: number,
  active: 1 | 2,
): ThrowAckResponse["scoreboardDelta"] {
  return {
    changedPlayers: [
      { playerId: 1, name: "Alice", score: alice, isActive: active === 1, isGuest: false },
      { playerId: 2, name: "Bob", score: bob, isActive: active === 2, isGuest: false },
    ],
    winnerId: null,
    status: "started",
    currentRound: 1,
  };
}

function buildThrowAck(alice: number, bob: number, active: 1 | 2 = 1): ThrowAckResponse {
  return {
    type: "ack",
    success: true,
    gameId: 4,
    stateVersion: "v2",
    throw: null,
    scoreboardDelta: buildDelta(alice, bob, active),
    serverTs: "2026-10-23T10:00:00Z",
  };
}

function buildUndoAck(alice: number, bob: number, active: 1 | 2 = 1): UndoAckResponse {
  return {
    type: "ack",
    success: true,
    gameId: 4,
    stateVersion: "v3",
    scoreboardDelta: buildDelta(alice, bob, active),
    serverTs: "2026-10-23T10:00:01Z",
  };
}

function send(session: GameSession): GameSession {
  const next = takeNextOp(session);
  if (next === null) {
    throw new Error("nothing to send");
  }
  return next.session;
}

function scores(game: GameThrowsResponse | null): number[] {
  return game?.players.map((player) => player.score) ?? [];
}

function throwMany(session: GameSession, values: (string | number)[]): GameSession {
  return values.reduce<GameSession>((current, value) => {
    const next = enqueueThrow(current, value);
    if (next === null) {
      throw new Error(`throw ${value} was refused`);
    }
    return next;
  }, session);
}

describe("gameSession.logic", () => {
  it("shows pending throws replayed over the confirmed game", () => {
    const session = throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [
      20,
      "T20",
      20,
      5,
    ]);

    expect(scores(getShownGame(session))).toEqual([201, 296]);
    expect(scores(session.confirmed)).toEqual([301, 301]);
    expect(getShownGame(session)?.activePlayerId).toBe(2);
  });

  it("sends the throw for the player who was active when it was tapped", () => {
    const session = throwMany(
      createGameSession(buildGame({ alice: 301, bob: 301 })),
      [20, 20, 20, 5],
    );

    expect(session.pending.map((op) => (op.kind === "throw" ? op.playerId : null))).toEqual([
      1, 1, 1, 2,
    ]);
  });

  it("refuses a seventh unconfirmed throw and reports the full queue", () => {
    const session = throwMany(
      createGameSession(buildGame({ alice: 301, bob: 301 })),
      [20, 20, 20, 20, 20, 20],
    );

    expect(getSessionView(session)).toMatchObject({
      canThrow: false,
      canUndo: true,
      isQueueFull: true,
      status: "syncing",
    });
    expect(enqueueThrow(session, 20)).toBeNull();
  });

  it("drops an unsent throw on undo instead of queueing an undo request", () => {
    const session = enqueueUndo(
      throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20, 5]),
    );

    expect(session.pending).toHaveLength(1);
    expect(scores(getShownGame(session))).toEqual([281, 301]);
  });

  it("queues an undo request behind a throw that is already sent", () => {
    const sent = { ...throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20]) };
    const session = enqueueUndo({ ...sent, isHeadSent: true });

    expect(session.pending.map((op) => op.kind)).toEqual(["throw", "undo"]);
    expect(scores(getShownGame(session))).toEqual([301, 301]);
  });

  it("steps back once per undo, also with a full queue", () => {
    let session = throwMany(
      createGameSession(buildGame({ alice: 301, bob: 301 })),
      [20, 20, 20, 20, 20, 20],
    );
    session = { ...session, isHeadSent: true };

    session = enqueueUndo(session);
    expect(scores(getShownGame(session))).toEqual([241, 261]);
    session = enqueueUndo(session);
    expect(scores(getShownGame(session))).toEqual([241, 281]);
    expect(getSessionView(session).canThrow).toBe(true);
  });

  it("reports idle without pending requests", () => {
    expect(getSessionView(createGameSession(buildGame({ alice: 301, bob: 301 })))).toEqual({
      canRetry: false,
      canThrow: true,
      canUndo: true,
      isFinished: false,
      isQueueFull: false,
      status: "idle",
    });
  });

  it("sends one request at a time, in tap order", () => {
    const session = throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20, 5]);

    const first = takeNextOp(session);
    expect(first?.op).toEqual({
      kind: "throw",
      playerId: 1,
      throwData: { value: 20, isDouble: false, isTriple: false },
    });
    expect(first && takeNextOp(first.session)).toBeNull();
  });

  it("confirms an acknowledged throw and keeps the rest of the queue shown", () => {
    const sent = send(throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20, 5]));

    const session = applyThrowAck(sent, buildThrowAck(281, 301));

    expect(scores(session?.confirmed ?? null)).toEqual([281, 301]);
    expect(session?.confirmed?.players[0]?.currentRoundThrows).toHaveLength(1);
    expect(session?.pending).toHaveLength(1);
    expect(scores(session && getShownGame(session))).toEqual([276, 301]);
    expect(session && getSessionView(session).status).toBe("syncing");
  });

  it("clears the throws of the finished turn when the turn passes to the next player", () => {
    let session = throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20, 20, 20]);
    session = applyThrowAck(send(session), buildThrowAck(281, 301)) ?? session;
    session = applyThrowAck(send(session), buildThrowAck(261, 301)) ?? session;
    const confirmed = applyThrowAck(send(session), buildThrowAck(241, 301, 2))?.confirmed;

    const [alice, bob] = confirmed?.players ?? [];
    expect(confirmed?.activePlayerId).toBe(2);
    expect(confirmed?.currentThrowCount).toBe(0);
    expect(alice?.currentRoundThrows).toEqual([]);
    expect(alice?.throwsInCurrentRound).toBe(0);
    expect(alice?.roundHistory).toHaveLength(1);
    expect(bob?.currentRoundThrows).toEqual([]);
    expect(bob?.throwsInCurrentRound).toBe(0);
  });

  it("ignores stale round throws after an undo when the next throw busts", () => {
    // After an undo on the summary page the backend can send the throws of the round it
    // reopened while it already counts zero throws for the current round.
    const staleThrow = { value: 25, isBust: false, isDouble: false, isTriple: false };
    const game = buildGameThrowsResponse({
      id: 4,
      currentRound: 7,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [
        buildBackendPlayer({
          id: 1,
          name: "Alice",
          score: 1,
          isActive: true,
          currentRoundThrows: [staleThrow, staleThrow],
        }),
        buildBackendPlayer({ id: 2, name: "Bob", score: 50 }),
      ],
    });
    const bustAck: ThrowAckResponse = {
      ...buildThrowAck(26, 50, 2),
      scoreboardDelta: {
        changedPlayers: [
          { playerId: 1, name: "Alice", score: 26, isActive: false, isGuest: false, isBust: true },
          { playerId: 2, name: "Bob", score: 50, isActive: true, isGuest: false, isBust: false },
        ],
        winnerId: null,
        status: "started",
        currentRound: 7,
      },
    };

    const sent = send(throwMany(createGameSession(game), [25]));
    const [alice, bob] = applyThrowAck(sent, bustAck)?.confirmed?.players ?? [];

    expect(alice?.score).toBe(26);
    expect(alice?.currentRoundThrows).toEqual([]);
    expect(alice?.throwsInCurrentRound).toBe(0);
    expect(alice?.roundHistory).toEqual([
      { round: 7, throws: [{ value: 25, isBust: true, isDouble: false, isTriple: false }] },
    ]);
    expect(bob?.isActive).toBe(true);
  });

  it("refuses an acknowledgement that keeps another player active than the client expects", () => {
    const sent = send(throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20]));

    expect(applyThrowAck(sent, buildThrowAck(281, 301, 2))).toBeNull();
    expect(applyThrowAck(sent, { ...buildThrowAck(281, 301), success: false })).toBeNull();
    expect(applyThrowAck(sent, { ...buildThrowAck(281, 301), gameId: 5 })).toBeNull();
  });

  it("confirms an acknowledged undo", () => {
    let session = send(throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20]));
    session = enqueueUndo(session);
    session = send(applyThrowAck(session, buildThrowAck(281, 301)) ?? session);

    const confirmed = applyUndoResponse(session, buildUndoAck(301, 301));

    expect(scores(confirmed?.confirmed ?? null)).toEqual([301, 301]);
    expect(confirmed?.pending).toHaveLength(0);
    expect(confirmed && getSessionView(confirmed).status).toBe("idle");
  });

  it("refuses a compact undo acknowledgement that failed or belongs to another game", () => {
    let session = send(throwMany(createGameSession(buildGame({ alice: 281, bob: 301 })), [20]));
    session = applyThrowAck(session, buildThrowAck(261, 301)) ?? session;
    session = send(enqueueUndo(session));

    expect(applyUndoResponse(session, { ...buildUndoAck(281, 301), success: false })).toBeNull();
    expect(applyUndoResponse(session, { ...buildUndoAck(281, 301), gameId: 5 })).toBeNull();
    expect(applyUndoResponse(session, buildUndoAck(281, 301))).not.toBeNull();
  });

  describe("compact undo acknowledgement after a completed turn", () => {
    function turn(round: number, ...values: number[]) {
      return {
        round,
        throws: values.map((value) => ({ value, isDouble: false, isTriple: false, isBust: false })),
      };
    }

    function buildThreeSeatGame(thirdRoundHistory: ReturnType<typeof turn>[]): GameThrowsResponse {
      return buildGameThrowsResponse({
        id: 4,
        currentRound: 3,
        activePlayerId: 3,
        settings: { startScore: 301, doubleOut: false, tripleOut: false },
        players: [
          buildBackendPlayer({
            id: 1,
            name: "Alice",
            score: 100,
            roundHistory: [turn(1, 20), turn(2, 20), turn(3, 20, 20, 20)],
          }),
          buildBackendPlayer({
            id: 2,
            name: "Bob",
            score: 0,
            position: 1,
            roundHistory: [turn(1, 20, 20, 20)],
          }),
          buildBackendPlayer({
            id: 3,
            name: "Cara",
            score: 150,
            isActive: true,
            position: null,
            roundHistory: thirdRoundHistory,
          }),
        ],
      });
    }

    function sendUndo(game: GameThrowsResponse): GameSession {
      return send(enqueueUndo(createGameSession(game)));
    }

    function buildThreeSeatAck(alice: number, active: 1 | 3): UndoAckResponse {
      return {
        ...buildUndoAck(alice, 0),
        scoreboardDelta: {
          changedPlayers: [
            { playerId: 1, name: "Alice", score: alice, isActive: active === 1, isGuest: false },
            { playerId: 3, name: "Cara", score: 150, isActive: active === 3, isGuest: false },
          ],
          winnerId: null,
          status: "started",
          currentRound: 3,
        },
      };
    }

    it("confirms the latest turn and skips a finished player", () => {
      const session = sendUndo(buildThreeSeatGame([turn(1, 20), turn(2, 20)]));

      const confirmed = applyUndoResponse(session, buildThreeSeatAck(120, 1))?.confirmed;

      expect(confirmed?.activePlayerId).toBe(1);
      expect(confirmed?.currentRound).toBe(3);
      expect(confirmed?.players.map((player) => player.roundHistory)).toEqual([
        [turn(1, 20), turn(2, 20)],
        [turn(1, 20, 20, 20)],
        [turn(1, 20), turn(2, 20)],
      ]);
      expect(confirmed?.players[0]?.currentRoundThrows).toEqual(turn(3, 20, 20).throws);
      expect(scores(confirmed ?? null)).toEqual([120, 0, 150]);
    });

    it("returns null when the delta marks another player active than the undo target", () => {
      const session = sendUndo(buildThreeSeatGame([turn(1, 20), turn(2, 20)]));

      expect(applyUndoResponse(session, buildThreeSeatAck(120, 3))).toBeNull();
    });

    it("returns null when no turn can be identified, so the caller reloads the game", () => {
      const game = buildThreeSeatGame([turn(1, 20)]);
      const session = sendUndo({
        ...game,
        players: game.players.map((player) =>
          player.id === 1 ? { ...player, roundHistory: [turn(1, 20)] } : player,
        ),
      });

      expect(applyUndoResponse(session, buildThreeSeatAck(120, 1))).toBeNull();
    });
  });

  it("drops every pending op on failure and blocks input until the reload answers", () => {
    const sent = send(
      throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20, 20, 20, 5]),
    );

    const failed = failSession(sent);

    expect(failed.pending).toHaveLength(0);
    expect(scores(getShownGame(failed))).toEqual([301, 301]);
    expect(getSessionView(failed)).toMatchObject({
      canThrow: false,
      canUndo: false,
      status: "syncing",
    });
    expect(takeNextOp(failed)).toBeNull();
  });

  it("reports failed after the reload and clears it on the next tap", () => {
    const reloaded = applyReloadedGame(
      failSession(send(throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20]))),
      buildGame({ alice: 301, bob: 301 }),
    );

    expect(getSessionView(reloaded)).toMatchObject({ canThrow: true, status: "failed" });
    expect(getSessionView(throwMany(reloaded, [20])).status).toBe("syncing");
    expect(getSessionView(enqueueUndo(reloaded)).status).toBe("syncing");
  });

  it("stays offline with Retry until a reload works", () => {
    const offline = markSessionOffline(
      failSession(send(throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), [20]))),
    );

    expect(getSessionView(offline)).toEqual({
      canRetry: true,
      canThrow: false,
      canUndo: false,
      isFinished: false,
      isQueueFull: false,
      status: "offline",
    });
    expect(enqueueThrow(offline, 20)).toBeNull();

    const retrying = retrySession(offline);
    expect(getSessionView(retrying)).toMatchObject({ canRetry: false, canThrow: false });

    const reloaded = applyReloadedGame(retrying, buildGame({ alice: 281, bob: 301 }));
    expect(getSessionView(reloaded)).toMatchObject({ canThrow: true, status: "failed" });
    expect(scores(reloaded.confirmed)).toEqual([281, 301]);
  });

  // #98: a failed first load lost no tap, so a working Retry leaves nothing to report.
  it("waits for Retry after a failed first load and clears it without a lost-throws notice", () => {
    const loadFailed = markFirstLoadFailed(createGameSession(buildGame({ alice: 281, bob: 301 })));

    expect(getSessionView(loadFailed)).toMatchObject({
      canRetry: true,
      canThrow: false,
      canUndo: false,
      status: "loadFailed",
    });
    expect(getSessionView(retrySession(loadFailed))).toMatchObject({
      canRetry: false,
      canThrow: true,
      status: "idle",
    });
  });

  // #96: the server finishes the game with the winning throw and says so in the ack.
  it("reports the game finished once the winning throw ack says so", () => {
    const sent = send(throwMany(createGameSession(buildGame({ alice: 20, bob: 301 })), [20]));
    expect(getSessionView(sent).isFinished).toBe(false);

    const ack = buildThrowAck(0, 301, 2);
    ack.scoreboardDelta = {
      changedPlayers: [
        { playerId: 1, name: "Alice", score: 0, isActive: false, isGuest: false, position: 1 },
        { playerId: 2, name: "Bob", score: 301, isActive: true, isGuest: false, position: 2 },
      ],
      winnerId: 1,
      status: "finished",
      currentRound: 1,
    };
    const acknowledged = applyThrowAck(sent, ack);

    expect(acknowledged).not.toBeNull();
    if (acknowledged === null) return;
    expect(getSessionView(acknowledged)).toMatchObject({ canThrow: false, isFinished: true });
  });

  // The server finishes the game once one active player is left, so a tap for that player
  // before the ack would be rejected.
  it("closes throw input after the winning throw and keeps undo open", () => {
    const won = throwMany(createGameSession(buildGame({ alice: 20, bob: 301 })), [20]);

    expect(getSessionView(won)).toMatchObject({ canThrow: false, canUndo: true });
    expect(enqueueThrow(won, 20)).toBeNull();
  });

  it("reopens throw input when the winning throw is undone", () => {
    const undone = enqueueUndo(
      throwMany(createGameSession(buildGame({ alice: 20, bob: 301 })), [20]),
    );

    expect(getSessionView(undone)).toMatchObject({ canThrow: true, isFinished: false });
    expect(scores(getShownGame(undone))).toEqual([20, 301]);
    expect(enqueueThrow(undone, 20)).not.toBeNull();
  });

  it("keeps throw input open after a checkout while two players are still in", () => {
    const game = buildGameThrowsResponse({
      id: 4,
      settings: { startScore: 301, doubleOut: false, tripleOut: false },
      players: [
        buildBackendPlayer({ id: 1, name: "Alice", score: 20, isActive: true }),
        buildBackendPlayer({ id: 2, name: "Bob", score: 301 }),
        buildBackendPlayer({ id: 3, name: "Carol", score: 301 }),
      ],
    });
    const checkedOut = throwMany(createGameSession(game), [20]);

    expect(scores(getShownGame(checkedOut))).toEqual([0, 301, 301]);
    expect(getSessionView(checkedOut)).toMatchObject({ canThrow: true, isFinished: false });
    expect(enqueueThrow(checkedOut, 20)).not.toBeNull();
  });

  it("rolls back a rejected winning throw and reports no finished game", () => {
    const sent = send(throwMany(createGameSession(buildGame({ alice: 20, bob: 301 })), [20]));
    const failed = failSession(sent);

    expect(getSessionView(failed).isFinished).toBe(false);
    expect(scores(getShownGame(failed))).toEqual([20, 301]);
  });

  it("reports a game the server already finished as finished", () => {
    const finishedGame: GameThrowsResponse = {
      ...buildGame({ alice: 0, bob: 301 }),
      status: "finished",
    };

    expect(getSessionView(createGameSession(finishedGame)).isFinished).toBe(true);
  });

  it("waits for every tap to be acknowledged before it reports a finished game", () => {
    const finishedGame: GameThrowsResponse = {
      ...buildGame({ alice: 0, bob: 301 }),
      status: "finished",
    };
    const session: GameSession = {
      ...createGameSession(finishedGame),
      pending: [{ kind: "undo" }],
    };

    expect(getSessionView(session).isFinished).toBe(false);
  });

  it("builds a throw request without a bust flag, which the backend would reject", () => {
    const session = send(
      throwMany(createGameSession(buildGame({ alice: 301, bob: 301 })), ["T20"]),
    );
    const head = session.pending[0];
    if (head?.kind !== "throw") {
      throw new Error("expected a pending throw");
    }

    expectTypeOf<ThrowRequest>().not.toHaveProperty("isBust");
    expect(toThrowRequest(head)).toEqual({
      playerId: 1,
      value: 20,
      isDouble: false,
      isTriple: true,
    });
  });
});
