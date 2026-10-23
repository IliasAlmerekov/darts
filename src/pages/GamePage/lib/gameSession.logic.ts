import { applyGameScoreboardDelta, normalizeGameData } from "@/lib/game/gameStateNormalizer";
import { parseThrowValue, type ParsedThrow } from "@/lib/game/parseThrowValue";
import type {
  GameSettings,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoThrowResponse,
} from "@/types";
import {
  applyOptimisticThrow,
  applyOptimisticUndo,
  applyScoreboardDeltaToGameState,
} from "../throws/throwStateService";

/** ADR 0003: two full turns may wait for the server. */
const MAX_UNCONFIRMED_THROWS = 6;

export type PendingOp =
  { kind: "throw"; playerId: number; throwData: ParsedThrow } | { kind: "undo" };

/**
 * State after a rejected request. `reloading`: the game is being read again. `failed`: the
 * reload worked and the player still has to learn that the last throws were lost.
 * `offline`: the reload failed as well, so input waits for Retry.
 */
type Recovery = "none" | "reloading" | "failed" | "offline";

export interface GameSession {
  /** The game as the server acknowledged it. */
  confirmed: GameThrowsResponse | null;
  /** Throws and undos the server has not acknowledged yet, in tap order. */
  pending: readonly PendingOp[];
  /** True while the request for `pending[0]` is on its way. */
  isHeadSent: boolean;
  recovery: Recovery;
}

export type SyncStatus = "idle" | "syncing" | "failed" | "offline";

export interface GameSessionView {
  status: SyncStatus;
  canThrow: boolean;
  canUndo: boolean;
  canRetry: boolean;
  /** The server has acknowledged every tap, so the page may call `/finish` or open the summary. */
  canFinish: boolean;
  isQueueFull: boolean;
}

export function createGameSession(game: GameThrowsResponse | null): GameSession {
  return { confirmed: normalizeGameData(game), pending: [], isHeadSent: false, recovery: "none" };
}

function applyOp(game: GameThrowsResponse, op: PendingOp): GameThrowsResponse {
  if (op.kind === "throw") {
    return applyOptimisticThrow(game, op.throwData, op.playerId) ?? game;
  }

  return applyOptimisticUndo(game) ?? game;
}

/** The scoreboard on screen: the pending throws and undos replayed over the confirmed game. */
export function getShownGame(session: GameSession): GameThrowsResponse | null {
  if (session.confirmed === null) {
    return null;
  }

  return session.pending.reduce(applyOp, session.confirmed);
}

function countUnconfirmedThrows(session: GameSession): number {
  return session.pending.filter((op) => op.kind === "throw").length;
}

export function getSessionView(session: GameSession): GameSessionView {
  const isBlocked = session.recovery === "reloading" || session.recovery === "offline";
  const isQueueFull = countUnconfirmedThrows(session) >= MAX_UNCONFIRMED_THROWS;
  const shown = getShownGame(session);

  let status: SyncStatus = "idle";
  if (session.recovery === "offline") {
    status = "offline";
  } else if (session.pending.length > 0 || session.recovery === "reloading") {
    status = "syncing";
  } else if (session.recovery === "failed") {
    status = "failed";
  }

  return {
    status,
    canThrow: !isBlocked && !isQueueFull && shown?.status === "started",
    canUndo: !isBlocked && shown !== null,
    canRetry: session.recovery === "offline",
    canFinish: !isBlocked && session.pending.length === 0 && shown !== null,
    isQueueFull,
  };
}

/** A tap clears the "not saved" notice of the previous failure. */
function clearFailedNotice(recovery: Recovery): Recovery {
  return recovery === "failed" ? "none" : recovery;
}

/**
 * Queues a throw for the active player of the shown game. Returns null when the throw cannot
 * be taken now. Throws `ApiError` for a value the keyboard cannot produce.
 */
export function enqueueThrow(session: GameSession, value: string | number): GameSession | null {
  const shown = getShownGame(session);
  if (!getSessionView(session).canThrow || shown === null || shown.activePlayerId === null) {
    return null;
  }

  const throwData = parseThrowValue(value);
  const playerId = shown.activePlayerId;
  if (applyOptimisticThrow(shown, throwData, playerId) === null) {
    return null;
  }

  return {
    ...session,
    pending: [...session.pending, { kind: "throw", playerId, throwData }],
    recovery: clearFailedNotice(session.recovery),
  };
}

/**
 * Steps the shown game back by one throw. An unsent throw leaves the queue and the server never
 * sees it; otherwise an undo request joins the queue.
 */
export function enqueueUndo(session: GameSession): GameSession {
  if (!getSessionView(session).canUndo) {
    return session;
  }

  const lastIndex = session.pending.length - 1;
  const last = session.pending[lastIndex];
  const isLastSent = lastIndex === 0 && session.isHeadSent;
  const pending: readonly PendingOp[] =
    last?.kind === "throw" && !isLastSent
      ? session.pending.slice(0, lastIndex)
      : [...session.pending, { kind: "undo" }];

  return { ...session, pending, recovery: clearFailedNotice(session.recovery) };
}

/** Marks the oldest pending op as sent and returns it, or null when nothing may be sent now. */
export function takeNextOp(session: GameSession): { session: GameSession; op: PendingOp } | null {
  const head = session.pending[0];
  if (head === undefined || session.isHeadSent || session.recovery !== "none") {
    return null;
  }

  return { session: { ...session, isHeadSent: true }, op: head };
}

export function toThrowRequest(op: Extract<PendingOp, { kind: "throw" }>): ThrowRequest {
  return { playerId: op.playerId, ...op.throwData };
}

function confirmHead(session: GameSession, confirmed: GameThrowsResponse): GameSession {
  return { ...session, confirmed, pending: session.pending.slice(1), isHeadSent: false };
}

/**
 * Applies the server's answer to the sent throw. Returns null when the answer disagrees with
 * the client, such as another active player, so the caller reloads the game.
 */
export function applyThrowAck(session: GameSession, ack: ThrowAckResponse): GameSession | null {
  const head = session.pending[0];
  const { confirmed } = session;
  if (
    head?.kind !== "throw" ||
    !session.isHeadSent ||
    confirmed === null ||
    !ack.success ||
    ack.gameId !== confirmed.id
  ) {
    return null;
  }

  const expected = applyOptimisticThrow(confirmed, head.throwData, head.playerId);
  if (expected === null) {
    return null;
  }

  const acknowledged = applyScoreboardDeltaToGameState(expected, ack.scoreboardDelta);
  if (acknowledged.activePlayerId !== expected.activePlayerId) {
    return null;
  }

  return confirmHead(session, acknowledged);
}

function hasValidActivePlayer(game: GameThrowsResponse): boolean {
  return (
    game.status !== "started" ||
    (typeof game.activePlayerId === "number" && Number.isFinite(game.activePlayerId))
  );
}

/**
 * Applies the server's answer to the sent undo: a compact acknowledgement or the full game.
 * Returns null when the answer leaves no valid active player, so the caller reloads the game.
 */
export function applyUndoResponse(
  session: GameSession,
  response: UndoThrowResponse,
): GameSession | null {
  const head = session.pending[0];
  const { confirmed } = session;
  if (head?.kind !== "undo" || !session.isHeadSent || confirmed === null) {
    return null;
  }

  let acknowledged: GameThrowsResponse | null;
  if ("scoreboardDelta" in response) {
    if (!response.success || response.gameId !== confirmed.id) {
      return null;
    }
    acknowledged = applyGameScoreboardDelta(
      applyOptimisticUndo(confirmed) ?? confirmed,
      response.scoreboardDelta,
    );
  } else {
    acknowledged = normalizeGameData(response);
  }

  if (acknowledged === null || acknowledged.id !== confirmed.id) {
    return null;
  }

  return hasValidActivePlayer(acknowledged) ? confirmHead(session, acknowledged) : null;
}

/** Drops every pending op after a rejected request; the caller reloads the game next. */
export function failSession(session: GameSession): GameSession {
  return { ...session, pending: [], isHeadSent: false, recovery: "reloading" };
}

/** Starts another reload after the server could not be reached. */
export function retrySession(session: GameSession): GameSession {
  return session.recovery === "offline" ? { ...session, recovery: "reloading" } : session;
}

export function applyReloadedGame(session: GameSession, game: GameThrowsResponse): GameSession {
  return { ...createGameSession(game), recovery: session.recovery === "none" ? "none" : "failed" };
}

export function markSessionOffline(session: GameSession): GameSession {
  return { ...session, recovery: "offline" };
}

export function applySessionSettings(session: GameSession, settings: GameSettings): GameSession {
  if (session.confirmed === null) {
    return session;
  }

  return {
    ...session,
    confirmed: {
      ...session.confirmed,
      settings: {
        startScore: settings.startScore,
        doubleOut: settings.doubleOut,
        tripleOut: settings.tripleOut,
      },
    },
  };
}
