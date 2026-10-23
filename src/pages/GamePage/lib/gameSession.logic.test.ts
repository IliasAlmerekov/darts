// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type { GameThrowsResponse } from "@/types";
import type { ThrowAckResponse, UndoAckResponse } from "@/types";
import {
  applyFinished,
  applyReloadedGame,
  applyThrowAck,
  applyUndoResponse,
  createGameSession,
  failSession,
  markSessionOffline,
  retrySession,
  takeFinish,
  takeNextOp,
  enqueueThrow,
  enqueueUndo,
  failFinish,
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
      isFinishFailed: false,
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

  it("takes the active player from the players when the undo answer leaves it out", () => {
    let session = send(throwMany(createGameSession(buildGame({ alice: 281, bob: 301 })), [20]));
    session = applyThrowAck(session, buildThrowAck(261, 301)) ?? session;
    session = send(enqueueUndo(session));

    const confirmed = applyUndoResponse(session, {
      ...buildGame({ alice: 281, bob: 301 }),
      activePlayerId: null,
    });

    expect(confirmed?.confirmed?.activePlayerId).toBe(1);
    expect(confirmed?.pending).toHaveLength(0);
  });

  it("refuses an undo answer without a valid active player", () => {
    let session = send(throwMany(createGameSession(buildGame({ alice: 281, bob: 301 })), [20]));
    session = applyThrowAck(session, buildThrowAck(261, 301)) ?? session;
    session = send(enqueueUndo(session));

    const fullGame = buildGame({ alice: 281, bob: 301 });
    const withoutActivePlayer = {
      ...fullGame,
      activePlayerId: null,
      players: fullGame.players.map((player) => ({ ...player, isActive: false })),
    };

    expect(applyUndoResponse(session, withoutActivePlayer)).toBeNull();
    expect(scores(applyUndoResponse(session, fullGame)?.confirmed ?? null)).toEqual([281, 301]);
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
      isFinishFailed: false,
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

  it("starts the finish once the confirmed game leaves one active player", () => {
    expect(takeFinish(createGameSession(buildGame({ alice: 20, bob: 301 })))).toBeNull();
    expect(
      takeFinish(throwMany(createGameSession(buildGame({ alice: 20, bob: 301 })), [20])),
    ).toBeNull();

    const finishing = takeFinish(createGameSession(buildGame({ alice: 0, bob: 301 })));
    expect(finishing).not.toBeNull();
    if (finishing === null) return;
    expect(getSessionView(finishing)).toMatchObject({
      canRetry: false,
      canThrow: false,
      canUndo: false,
      status: "syncing",
    });
    expect(takeFinish(finishing)).toBeNull();
  });

  it("offers Retry and Undo after a failed finish, and Undo drops the finish", () => {
    const finishing = takeFinish(createGameSession(buildGame({ alice: 0, bob: 301 })));
    if (finishing === null) throw new Error("finish refused");
    const failed = failFinish(finishing);

    expect(getSessionView(failed)).toMatchObject({
      canRetry: true,
      canThrow: false,
      canUndo: true,
      isFinishFailed: true,
      status: "offline",
    });
    expect(getSessionView(retrySession(failed))).toMatchObject({
      canRetry: false,
      canUndo: false,
      isFinishFailed: false,
      status: "syncing",
    });

    const undone = enqueueUndo(failed);
    expect(getSessionView(undone)).toMatchObject({ isFinishFailed: false, status: "syncing" });
    expect(takeNextOp(undone)?.op).toEqual({ kind: "undo" });
  });

  it("reports the game finished after the finish, or once the server shows it finished", () => {
    const finishing = takeFinish(createGameSession(buildGame({ alice: 0, bob: 301 })));
    if (finishing === null) throw new Error("finish refused");
    expect(getSessionView(finishing).isFinished).toBe(false);
    expect(getSessionView(applyFinished(finishing))).toMatchObject({
      canThrow: false,
      canUndo: false,
      isFinished: true,
    });

    const finishedGame: GameThrowsResponse = {
      ...buildGame({ alice: 0, bob: 301 }),
      status: "finished",
    };
    expect(getSessionView(createGameSession(finishedGame)).isFinished).toBe(true);
    expect(takeFinish(createGameSession(finishedGame))).toBeNull();
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
});
