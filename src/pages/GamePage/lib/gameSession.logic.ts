import { applyScoreboardDelta } from "@/lib/game/applyScoreboardDelta";
import { parseThrowValue, type ParsedThrow } from "@/lib/game/parseThrowValue";
import { getFinishedPlayers, mapPlayersToUI } from "@/lib/game/player-mappers";
import type { UIPlayer } from "@/types";
import { applyOptimisticThrow, applyOptimisticUndo } from "./optimisticThrow.logic";
import type {
  GameSettings,
  GameSummaryResponse,
  GameThrowsResponse,
  ThrowAckResponse,
  ThrowRequest,
  UndoAckResponse,
} from "@/shared/api/game";
import type { ClientLogger } from "@/shared/services/browser/clientLogger";
import type { SoundType } from "@/shared/services/browser/soundPlayer";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";

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

type PendingOp = { kind: "throw"; playerId: number; throwData: ParsedThrow } | { kind: "undo" };

/**
 * State after a rejected request. `reloading`: the game is being read again. `failed`: the
 * reload worked and the player still has to learn that the last throws were lost.
 * `offline`: the reload failed as well, so input waits for Retry. `loadFailed`: the first load
 * failed while the store showed a copy of the game; no tap was lost, and input waits for Retry.
 */
type Recovery = "none" | "reloading" | "failed" | "offline" | "loadFailed";

interface GameSession {
  /** The game as the server acknowledged it. */
  confirmed: GameThrowsResponse | null;
  /** Throws and undos the server has not acknowledged yet, in tap order. */
  pending: readonly PendingOp[];
  /** True while the request for `pending[0]` is on its way. */
  isHeadSent: boolean;
  recovery: Recovery;
  /**
   * The player whose checkout opened the finish overlay. Only the first checkout, a throw that
   * takes a player to 0 while no other player is at 0, opens it. A load starts with none.
   */
  finishOverlayPlayerId: number | null;
}

/**
 * `failed` and `offline` follow a rejected request, so throws were lost. `loadFailed` follows a
 * failed first load over a cached game, which lost no tap. `offline` and `loadFailed` wait for
 * Retry.
 */
export type SyncStatus = "idle" | "syncing" | "failed" | "offline" | "loadFailed";

interface QueueView {
  status: SyncStatus;
  canThrow: boolean;
  canUndo: boolean;
  canRetry: boolean;
  /** The server has finished the game and acknowledged every tap, so the summary may open. */
  isFinished: boolean;
  isQueueFull: boolean;
  canOpenSettings: boolean;
  shouldShowFinishOverlay: boolean;
  /** The overlay's Finish game may be sent: the server acknowledged every tap (#96). */
  canFinishGame: boolean;
  activePlayers: UIPlayer[];
  finishedPlayers: UIPlayer[];
  activePlayer: GameThrowsResponse["players"][number] | null;
}

function createState(game: GameThrowsResponse | null): GameSession {
  return {
    confirmed: game,
    pending: [],
    isHeadSent: false,
    recovery: "none",
    finishOverlayPlayerId: null,
  };
}

function applyOp(game: GameThrowsResponse, op: PendingOp): GameThrowsResponse {
  if (op.kind === "throw") {
    return applyOptimisticThrow(game, op.throwData, op.playerId) ?? game;
  }

  return applyOptimisticUndo(game) ?? game;
}

/** The scoreboard on screen: the pending throws and undos replayed over the confirmed game. */
function getShownGame(session: GameSession): GameThrowsResponse | null {
  if (session.confirmed === null) {
    return null;
  }

  return session.pending.reduce(applyOp, session.confirmed);
}

function countUnconfirmedThrows(session: GameSession): number {
  return session.pending.filter((op) => op.kind === "throw").length;
}

function getGameSessionView(session: GameSession): QueueView {
  const isWaitingForRetry = session.recovery === "offline" || session.recovery === "loadFailed";
  const isBlocked = isWaitingForRetry || session.recovery === "reloading";
  const isQueueFull = countUnconfirmedThrows(session) >= MAX_UNCONFIRMED_THROWS;
  const shown = getShownGame(session);
  const players = mapPlayersToUI(shown?.players ?? [], shown?.currentRound);
  const activePlayers = players.filter((player) => player.score > 0);
  const finishedPlayers = getFinishedPlayers(players);
  // A rejected checkout rolls the score back, which closes the overlay with it.
  const shouldShowFinishOverlay =
    shown?.status !== "finished" &&
    !isLastActivePlayerLeft(shown) &&
    players.some((player) => player.id === session.finishOverlayPlayerId && player.score === 0);

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
    canFinishGame:
      shouldShowFinishOverlay && session.recovery === "none" && session.pending.length === 0,
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
function enqueueThrow(session: GameSession, value: string | number): GameSession | null {
  const shown = getShownGame(session);
  if (!getGameSessionView(session).canThrow || shown === null || shown.activePlayerId === null) {
    return null;
  }

  const throwData = parseThrowValue(value);
  const playerId = shown.activePlayerId;
  const next = applyOptimisticThrow(shown, throwData, playerId);
  if (next === null) {
    return null;
  }

  const isFirstCheckout =
    !shown.players.some((player) => player.score === 0) &&
    next.players.some((player) => player.id === playerId && player.score === 0);
  return {
    ...session,
    pending: [...session.pending, { kind: "throw", playerId, throwData }],
    recovery: clearFailedNotice(session.recovery),
    finishOverlayPlayerId: isFirstCheckout ? playerId : session.finishOverlayPlayerId,
  };
}

/**
 * Steps the shown game back by one throw. An unsent throw leaves the queue and the server never
 * sees it; otherwise an undo request joins the queue.
 */
function enqueueUndo(session: GameSession): GameSession {
  if (!getGameSessionView(session).canUndo) {
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

/** The overlay's Continue: play goes on, and later checkouts open no overlay. */
function closeFinishOverlay(session: GameSession): GameSession {
  return { ...session, finishOverlayPlayerId: null };
}

/** The server finished the game from the overlay's Finish game, so the summary may open. */
function markGameFinished(session: GameSession): GameSession {
  if (session.confirmed === null) {
    return session;
  }

  return { ...session, confirmed: { ...session.confirmed, status: "finished" } };
}

function undoOverlay(session: GameSession): GameSession {
  if (
    session.recovery === "reloading" ||
    session.recovery === "offline" ||
    session.recovery === "loadFailed"
  ) {
    return session;
  }
  return enqueueUndo(closeFinishOverlay(session));
}

/** Marks the oldest pending op as sent and returns it, or null when nothing may be sent now. */
function takeNextOp(session: GameSession): { session: GameSession; op: PendingOp } | null {
  const head = session.pending[0];
  if (head === undefined || session.isHeadSent || session.recovery !== "none") {
    return null;
  }

  return { session: { ...session, isHeadSent: true }, op: head };
}

function toThrowRequest(op: Extract<PendingOp, { kind: "throw" }>): ThrowRequest {
  return { playerId: op.playerId, ...op.throwData };
}

function confirmHead(session: GameSession, confirmed: GameThrowsResponse): GameSession {
  return { ...session, confirmed, pending: session.pending.slice(1), isHeadSent: false };
}

/**
 * Applies the server's answer to the sent throw. Returns null when the answer disagrees with
 * the client, such as another active player, so the caller reloads the game.
 */
function applyThrowAck(session: GameSession, ack: ThrowAckResponse): GameSession | null {
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
function applyUndoResponse(session: GameSession, ack: UndoAckResponse): GameSession | null {
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
function failSession(session: GameSession): GameSession {
  return { ...session, pending: [], isHeadSent: false, recovery: "reloading" };
}

/**
 * Starts another reload after the server could not be reached. After a failed first load the
 * session drops the Retry state, and the caller loads the game again.
 */
function retrySession(session: GameSession): GameSession {
  if (session.recovery === "offline") {
    return { ...session, recovery: "reloading" };
  }

  return session.recovery === "loadFailed" ? { ...session, recovery: "none" } : session;
}

function applyReloadedGame(session: GameSession, game: GameThrowsResponse): GameSession {
  return {
    ...createState(game),
    recovery: session.recovery === "none" ? "none" : "failed",
  };
}

function markSessionOffline(session: GameSession): GameSession {
  return { ...session, recovery: "offline" };
}

/** The first load failed while the store showed a copy of the game (#98). */
function markFirstLoadFailed(session: GameSession): GameSession {
  return { ...session, recovery: "loadFailed" };
}

function applySessionSettings(session: GameSession, settings: GameSettings): GameSession {
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

export interface GameSessionTransport {
  loadGame: (id: number, signal: AbortSignal) => Promise<GameThrowsResponse>;
  recordThrow: (id: number, request: ThrowRequest) => Promise<ThrowAckResponse>;
  undoLastThrow: (id: number) => Promise<UndoAckResponse>;
  finishGame: (id: number, signal: AbortSignal) => Promise<GameSummaryResponse>;
}

interface Options {
  gameId: number;
  cachedGame: GameThrowsResponse | null;
  transport: GameSessionTransport;
  playSound: (sound: SoundType) => void;
  log: ClientLogger;
  onGameChange: (game: GameThrowsResponse | null) => void;
  onFinished: (summary: GameSummaryResponse) => void;
}

export interface GameSessionView extends QueueView {
  game: GameThrowsResponse | null;
  isLoading: boolean;
  error: Error | null;
  isInteractionDisabled: boolean;
  isUndoDisabled: boolean;
  isSettingsDisabled: boolean;
  isFinishPending: boolean;
  finishError: string | null;
}

export interface GameSessionController {
  getView: () => GameSessionView;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
  throwDart: (value: string | number) => void;
  undo: () => void;
  continueGame: () => void;
  undoFromOverlay: () => void;
  finishGame: () => void;
  retry: () => void;
  updateSettings: (settings: GameSettings) => void;
}

export function createGameSession(options: Options): GameSessionController {
  const { gameId, transport, playSound, log, onGameChange, onFinished } = options;
  const controller = new AbortController();
  const listeners = new Set<() => void>();
  const cached = options.cachedGame;
  let state = createState(cached?.id === gameId && cached.status !== "finished" ? cached : null);
  let loading = true;
  let error: Error | null = null;
  let finishPending = false;
  let finishError: string | null = null;
  let disposed = false;
  function notify(): void {
    if (!disposed) listeners.forEach((listener) => listener());
  }
  function commit(next: GameSession): void {
    const previous = state;
    state = next;
    if (next.confirmed !== previous.confirmed || next.pending !== previous.pending)
      onGameChange(getShownGame(next));
    if (
      getGameSessionView(next).shouldShowFinishOverlay &&
      !getGameSessionView(previous).shouldShowFinishOverlay
    ) {
      finishPending = false;
      finishError = null;
    }
    notify();
  }
  function getView(): GameSessionView {
    const view = getGameSessionView(state);
    const game = getShownGame(state);
    return {
      ...view,
      game,
      isLoading: loading,
      error,
      isInteractionDisabled: loading || !!error || !game || !view.canThrow,
      isUndoDisabled: loading || !!error || !game || !view.canUndo,
      isSettingsDisabled: !game || !view.canOpenSettings,
      isFinishPending: finishPending,
      finishError,
      canThrow: !loading && !error && view.canThrow,
      canUndo: !loading && !error && view.canUndo,
    };
  }
  async function load(first: boolean): Promise<void> {
    if (first) {
      loading = true;
      error = null;
      notify();
    }
    try {
      const game = await transport.loadGame(gameId, controller.signal);
      if (disposed) return;
      if (game.id !== gameId) throw new Error("Game response does not match the requested game");
      commit(applyReloadedGame(state, game));
    } catch (caught) {
      if (disposed) return;
      if (first) {
        const fetchError =
          caught instanceof Error ? caught : new Error("Failed to fetch game data");
        log.error("game.fetch.failed", { context: { gameId }, error: fetchError });
        if (state.confirmed !== null) commit(markFirstLoadFailed(state));
        else error = fetchError;
      } else {
        log.error("game.sync.reload.failed", { context: { gameId }, error: caught });
        commit(markSessionOffline(state));
      }
    } finally {
      if (!disposed && first) {
        loading = false;
        notify();
      }
    }
  }
  function recover(): void {
    commit(failSession(state));
    playSound("error");
    void load(false);
  }
  async function sendNext(): Promise<void> {
    for (let next = takeNextOp(state); next !== null; next = takeNextOp(state)) {
      commit(next.session);
      try {
        let applied: GameSession | null;
        if (next.op.kind === "throw") {
          const ack = await transport.recordThrow(gameId, toThrowRequest(next.op));
          if (disposed) return;
          applied = applyThrowAck(state, ack);
        } else {
          const ack = await transport.undoLastThrow(gameId);
          if (disposed) return;
          applied = applyUndoResponse(state, ack);
        }
        if (applied === null) {
          log.warn("game.sync.ack-mismatch", { context: { gameId, op: next.op.kind } });
          recover();
          return;
        }
        commit(applied);
      } catch (caught) {
        if (disposed) return;
        log.error("game.sync.failed", { context: { gameId, op: next.op.kind }, error: caught });
        recover();
        return;
      }
    }
  }
  function throwDart(value: string | number): void {
    if (disposed || !getView().canThrow) return;
    try {
      const next = enqueueThrow(state, value);
      if (next !== null) {
        commit(next);
        void sendNext();
        return;
      }
      log.error("game.throw.missing-active-player", {
        context: { gameId, activePlayerId: getShownGame(state)?.activePlayerId ?? null },
      });
      recover();
    } catch (caught) {
      log.error("game.throw.invalid-value", { context: { gameId }, error: caught });
      playSound("error");
    }
  }
  function undo(): void {
    if (disposed || !getView().canUndo) return;
    commit(enqueueUndo(state));
    playSound("undo");
    void sendNext();
  }
  function continueGame(): void {
    if (disposed || finishPending) return;
    finishError = null;
    commit(closeFinishOverlay(state));
  }
  function undoFromOverlay(): void {
    if (disposed || finishPending) return;
    finishError = null;
    const previous = state;
    const next = undoOverlay(state);
    commit(next);
    if (next.pending !== previous.pending) {
      playSound("undo");
      void sendNext();
    }
  }
  async function finishGame(): Promise<void> {
    if (disposed || finishPending || !getGameSessionView(state).canFinishGame) return;
    finishPending = true;
    finishError = null;
    notify();
    try {
      const summary = await transport.finishGame(gameId, controller.signal);
      if (disposed) return;
      onFinished(summary);
      commit(markGameFinished(state));
    } catch (caught) {
      if (disposed) return;
      finishPending = false;
      log.error("game.finish.failed", { context: { gameId }, error: caught });
      finishError = toUserErrorMessage(caught, "Could not finish the game. Please try again.");
      notify();
    }
  }
  function retry(): void {
    if (disposed) return;
    const first = state.recovery !== "offline";
    commit(retrySession(state));
    void load(first);
  }
  function updateSettings(settings: GameSettings): void {
    if (disposed) return;
    commit(applySessionSettings(state, settings));
  }
  void load(true);
  return {
    getView,
    subscribe: (listener: () => void): (() => void) => {
      if (!disposed) {
        listeners.add(listener);
        listener();
      }
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: (): void => {
      disposed = true;
      controller.abort();
      listeners.clear();
    },
    throwDart,
    undo,
    continueGame,
    undoFromOverlay,
    finishGame: (): void => {
      void finishGame();
    },
    retry,
    updateSettings,
  };
}
