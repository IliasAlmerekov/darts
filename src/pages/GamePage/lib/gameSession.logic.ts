import { normalizeGameData } from "@/lib/game/gameStateNormalizer";
import { parseThrowValue, type ParsedThrow } from "@/lib/game/parseThrowValue";
import type {
  GameSettings,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoAckResponse,
} from "@/shared/api/game";
import {
  applyOptimisticThrow,
  applyOptimisticUndo,
  applyScoreboardDelta,
} from "./optimisticThrow.logic";
import { getFinishedPlayers, mapPlayersToUI } from "@/lib/game/player-mappers";
import type { UIPlayer } from "@/types";

/** True when any player has a throw in the current round or in a finished round. */
function hasThrowHistory(gameData: GameThrowsResponse | null): boolean {
  if (!gameData) {
    return false;
  }

  return gameData.players.some(
    (player) => player.currentRoundThrows.length > 0 || player.roundHistory.length > 0,
  );
}

/**
 * True when an unfinished game has one active player left and at least one finished. The server
 * finishes the game at that point, so the page shows no finish overlay and takes no throw.
 */
function isLastActivePlayerLeft(gameData: GameThrowsResponse | null): boolean {
  if (!gameData || gameData.status === "finished") {
    return false;
  }

  const activePlayersCount = gameData.players.filter((player) => player.score > 0).length;
  const finishedPlayersCount = gameData.players.filter((player) => player.score === 0).length;

  return activePlayersCount === 1 && finishedPlayersCount >= 1;
}

/** ADR 0003: two full turns may wait for the server. */
const MAX_UNCONFIRMED_THROWS = 6;

export type PendingOp =
  { kind: "throw"; playerId: number; throwData: ParsedThrow } | { kind: "undo" };

/**
 * State after a rejected request. `reloading`: the game is being read again. `failed`: the
 * reload worked and the player still has to learn that the last throws were lost.
 * `offline`: the reload failed as well, so input waits for Retry. `loadFailed`: the first load
 * failed while the store showed a copy of the game; no tap was lost, and input waits for Retry.
 */
type Recovery = "none" | "reloading" | "failed" | "offline" | "loadFailed";

export interface GameSession {
  /** The game as the server acknowledged it. */
  confirmed: GameThrowsResponse | null;
  /** Throws and undos the server has not acknowledged yet, in tap order. */
  pending: readonly PendingOp[];
  /** True while the request for `pending[0]` is on its way. */
  isHeadSent: boolean;
  recovery: Recovery;
  dismissedZeroScorePlayerIds: number[];
  skipFinishOverlay: boolean;
}

/**
 * `failed` and `offline` follow a rejected request, so throws were lost. `loadFailed` follows a
 * failed first load over a cached game, which lost no tap. `offline` and `loadFailed` wait for
 * Retry.
 */
export type SyncStatus = "idle" | "syncing" | "failed" | "offline" | "loadFailed";

export interface GameSessionView {
  status: SyncStatus;
  canThrow: boolean;
  canUndo: boolean;
  canRetry: boolean;
  /** The server has finished the game and acknowledged every tap, so the summary may open. */
  isFinished: boolean;
  isQueueFull: boolean;
  canOpenSettings: boolean;
  shouldShowFinishOverlay: boolean;
  activePlayers: UIPlayer[];
  finishedPlayers: UIPlayer[];
  activePlayer: GameThrowsResponse["players"][number] | null;
}

export function createGameSession(
  game: GameThrowsResponse | null,
  skipFinishOverlay = false,
): GameSession {
  return {
    confirmed: normalizeGameData(game),
    pending: [],
    isHeadSent: false,
    recovery: "none",
    dismissedZeroScorePlayerIds: [],
    skipFinishOverlay,
  };
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
  const isWaitingForRetry = session.recovery === "offline" || session.recovery === "loadFailed";
  const isBlocked = isWaitingForRetry || session.recovery === "reloading";
  const isQueueFull = countUnconfirmedThrows(session) >= MAX_UNCONFIRMED_THROWS;
  const shown = getShownGame(session);
  const players = mapPlayersToUI(shown?.players ?? [], shown?.currentRound);
  const activePlayers = players.filter((player) => player.score > 0);
  const finishedPlayers = getFinishedPlayers(players);
  const shouldShowFinishOverlay =
    !session.skipFinishOverlay &&
    shown?.status !== "finished" &&
    !isLastActivePlayerLeft(shown) &&
    players.some(
      (player) => player.score === 0 && !session.dismissedZeroScorePlayerIds.includes(player.id),
    );

  let status: SyncStatus = "idle";
  if (session.recovery === "offline" || session.recovery === "loadFailed") {
    status = session.recovery;
  } else if (session.pending.length > 0 || session.recovery === "reloading") {
    status = "syncing";
  } else if (session.recovery === "failed") {
    status = "failed";
  }

  return {
    status,
    // The server finishes the game once one active player is left and would reject the next
    // tap, so throw input closes with the winning throw. Undo stays open to take it back.
    canThrow:
      !isBlocked &&
      !isQueueFull &&
      !shouldShowFinishOverlay &&
      shown?.status === "started" &&
      !isLastActivePlayerLeft(shown),
    canUndo: !isBlocked && !shouldShowFinishOverlay && hasThrowHistory(shown),
    canOpenSettings: status !== "syncing" && !hasThrowHistory(shown),
    shouldShowFinishOverlay,
    activePlayers,
    finishedPlayers,
    activePlayer: shown?.players.find((player) => player.id === shown.activePlayerId) ?? null,
    canRetry: isWaitingForRetry,
    // The server finishes the game with the winning throw. Leaving the page drops
    // unacknowledged taps, so the summary waits until the server confirmed every one (#96).
    isFinished: !isBlocked && session.pending.length === 0 && shown?.status === "finished",
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

  const next = { ...session, pending, recovery: clearFailedNotice(session.recovery) };
  const zeroIds =
    getShownGame(next)
      ?.players.filter((player) => player.score === 0)
      .map((player) => player.id) ?? [];
  return {
    ...next,
    dismissedZeroScorePlayerIds: next.dismissedZeroScorePlayerIds.filter((id) =>
      zeroIds.includes(id),
    ),
  };
}

export function dismissFinishedPlayers(session: GameSession): GameSession {
  const ids =
    getShownGame(session)
      ?.players.filter((player) => player.score === 0)
      .map((player) => player.id) ?? [];
  return {
    ...session,
    dismissedZeroScorePlayerIds: Array.from(
      new Set([...session.dismissedZeroScorePlayerIds, ...ids]),
    ),
  };
}

export function undoFromOverlay(session: GameSession): GameSession {
  return enqueueUndo(dismissFinishedPlayers(session));
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

  const acknowledged = applyScoreboardDelta(expected, ack.scoreboardDelta);
  if (acknowledged.activePlayerId !== expected.activePlayerId) {
    return null;
  }

  return confirmHead(session, acknowledged);
}

/**
 * Applies the server's answer to the sent undo. Returns null when the answer disagrees with
 * the client, so the caller reloads the game.
 */
export function applyUndoResponse(session: GameSession, ack: UndoAckResponse): GameSession | null {
  const head = session.pending[0];
  const { confirmed } = session;
  if (
    head?.kind !== "undo" ||
    !session.isHeadSent ||
    confirmed === null ||
    !ack.success ||
    ack.gameId !== confirmed.id
  ) {
    return null;
  }

  const undone = applyOptimisticUndo(confirmed);
  if (undone === null) {
    return null;
  }

  const acknowledged = applyScoreboardDelta(undone, ack.scoreboardDelta);
  if (acknowledged.activePlayerId !== undone.activePlayerId) {
    return null;
  }

  return confirmHead(session, acknowledged);
}

/** Drops every pending op after a rejected request; the caller reloads the game next. */
export function failSession(session: GameSession): GameSession {
  return { ...session, pending: [], isHeadSent: false, recovery: "reloading" };
}

/**
 * Starts another reload after the server could not be reached. After a failed first load the
 * session drops the Retry state, and the caller loads the game again.
 */
export function retrySession(session: GameSession): GameSession {
  if (session.recovery === "offline") {
    return { ...session, recovery: "reloading" };
  }

  return session.recovery === "loadFailed" ? { ...session, recovery: "none" } : session;
}

export function applyReloadedGame(session: GameSession, game: GameThrowsResponse): GameSession {
  return {
    ...createGameSession(game, session.skipFinishOverlay),
    dismissedZeroScorePlayerIds: session.dismissedZeroScorePlayerIds.filter((id) =>
      game.players.some((player) => player.id === id && player.score === 0),
    ),
    recovery: session.recovery === "none" ? "none" : "failed",
  };
}

export function markSessionOffline(session: GameSession): GameSession {
  return { ...session, recovery: "offline" };
}

/** The first load failed while the store showed a copy of the game (#98). */
export function markFirstLoadFailed(session: GameSession): GameSession {
  return { ...session, recovery: "loadFailed" };
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
