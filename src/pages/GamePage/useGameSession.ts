import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import {
  finishGame,
  getGameThrows,
  getGameThrowsIfChanged,
  recordThrow,
  resetGameStateVersion,
  setGameStateVersion,
  undoLastThrow,
} from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { playSound } from "@/shared/services/browser/soundPlayer";
import {
  $error,
  $gameData,
  $isLoading,
  resetGameStore,
  setError,
  setGameData,
  setLoading,
} from "@/shared/store";
import type { GameSettings, GameThrowsResponse } from "@/types";
import {
  applyFinished,
  applyReloadedGame,
  applySessionSettings,
  applyThrowAck,
  applyUndoResponse,
  createGameSession,
  enqueueThrow,
  enqueueUndo,
  failFinish,
  failSession,
  getSessionView,
  getShownGame,
  markSessionOffline,
  retrySession,
  takeFinish,
  takeNextOp,
  toThrowRequest,
  type GameSession,
  type GameSessionView,
} from "./lib/gameSession.logic";

interface GameSessionPageView extends GameSessionView {
  game: GameThrowsResponse | null;
  isLoading: boolean;
  error: Error | null;
}

interface GameSessionCommands {
  throwDart: (value: string | number) => void;
  undo: () => void;
  /**
   * Reloads the game after a failed first load or after the server could not be reached, or
   * sends a failed `/finish` again.
   */
  retry: () => void;
  updateSettings: (settings: GameSettings) => void;
}

interface UseGameSessionReturn {
  view: GameSessionPageView;
  commands: GameSessionCommands;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Owns the game on screen: it loads the game, keeps the optimistic throw queue of ADR 0003,
 * finishes the game and is the only writer of the game store while the game page is open.
 * Every response carries the session generation; one that arrives after the page left the game
 * is ignored.
 */
export function useGameSession(gameId: number | null): UseGameSessionReturn {
  // Local to this hook, so each game page instance starts with its own queue.
  const [sessionAtom] = useState(() => atom<GameSession>(createGameSession(null)));
  const session = useStore(sessionAtom);
  const game = useStore($gameData);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const commit = useCallback(
    (next: GameSession): void => {
      const previous = sessionAtom.get();
      sessionAtom.set(next);
      if (next.confirmed !== previous.confirmed || next.pending !== previous.pending) {
        setGameData(getShownGame(next));
      }
    },
    [sessionAtom],
  );

  const isCurrent = useCallback(
    (generation: number): boolean => generation === generationRef.current,
    [],
  );

  /** Sends `/finish` for a session that `takeFinish` or `retrySession` marked as sending. */
  const sendFinish = useCallback(
    async (id: number, generation: number): Promise<void> => {
      try {
        const summary = await finishGame(id, controllerRef.current?.signal);
        if (!isCurrent(generation)) {
          return;
        }
        resetGameStateVersion(id);
        queryClient.setQueryData(gameQueries.finished(id).queryKey, summary);
        commit(applyFinished(sessionAtom.get()));
      } catch (finishError) {
        if (!isCurrent(generation) || isAbortError(finishError)) {
          return;
        }
        clientLogger.error("game.finish.failed", { context: { gameId: id }, error: finishError });
        commit(failFinish(sessionAtom.get()));
      }
    },
    [commit, isCurrent, sessionAtom],
  );

  /** Sends `/finish` once the confirmed game leaves one active player (#96). */
  const finishIfOver = useCallback(
    (id: number, generation: number): void => {
      const next = takeFinish(sessionAtom.get());
      if (next !== null) {
        commit(next);
        void sendFinish(id, generation);
      }
    },
    [commit, sendFinish, sessionAtom],
  );

  const loadGame = useCallback(
    async (id: number, generation: number): Promise<void> => {
      const signal = controllerRef.current?.signal;
      setLoading(true);
      setError(null);

      try {
        const data = await getGameThrowsIfChanged(id, signal);
        if (!isCurrent(generation)) {
          return;
        }
        if (data) {
          commit(createGameSession(data));
          finishIfOver(id, generation);
        }
      } catch (loadError) {
        if (!isCurrent(generation) || isAbortError(loadError)) {
          return;
        }
        const fetchError =
          loadError instanceof Error ? loadError : new Error("Failed to fetch game data");
        setError(fetchError);
        clientLogger.error("game.fetch.failed", { context: { gameId: id }, error: fetchError });
      } finally {
        if (isCurrent(generation)) {
          setLoading(false);
        }
      }
    },
    [commit, finishIfOver, isCurrent],
  );

  /** Reads the game from the server after a rejected request; the session is `reloading`. */
  const reloadAfterFailure = useCallback(
    async (id: number, generation: number): Promise<void> => {
      resetGameStateVersion(id);

      try {
        const fresh = await getGameThrows(id, controllerRef.current?.signal);
        if (!isCurrent(generation)) {
          return;
        }
        commit(applyReloadedGame(sessionAtom.get(), fresh));
        finishIfOver(id, generation);
      } catch (reloadError) {
        if (!isCurrent(generation) || isAbortError(reloadError)) {
          return;
        }
        clientLogger.error("game.sync.reload.failed", {
          context: { gameId: id },
          error: reloadError,
        });
        commit(markSessionOffline(sessionAtom.get()));
      }
    },
    [commit, finishIfOver, isCurrent, sessionAtom],
  );

  const recover = useCallback(
    (id: number, generation: number): void => {
      commit(failSession(sessionAtom.get()));
      playSound("error");
      void reloadAfterFailure(id, generation);
    },
    [commit, reloadAfterFailure, sessionAtom],
  );

  /** Sends the queued ops one at a time, in tap order, until the queue is empty or a request fails. */
  const sendNext = useCallback(async (): Promise<void> => {
    if (gameId === null) {
      return;
    }

    const generation = generationRef.current;
    for (
      let next = takeNextOp(sessionAtom.get());
      next !== null;
      next = takeNextOp(sessionAtom.get())
    ) {
      commit(next.session);

      try {
        let applied: GameSession | null;
        if (next.op.kind === "throw") {
          const ack = await recordThrow(gameId, toThrowRequest(next.op));
          if (!isCurrent(generation)) {
            return;
          }
          applied = applyThrowAck(sessionAtom.get(), ack);
          if (applied !== null) {
            setGameStateVersion(gameId, ack.stateVersion);
          }
        } else {
          const response = await undoLastThrow(gameId);
          if (!isCurrent(generation)) {
            return;
          }
          applied = applyUndoResponse(sessionAtom.get(), response);
        }

        if (applied === null) {
          clientLogger.warn("game.sync.ack-mismatch", { context: { gameId, op: next.op.kind } });
          recover(gameId, generation);
          return;
        }

        commit(applied);
      } catch (sendError) {
        if (!isCurrent(generation)) {
          return;
        }
        clientLogger.error("game.sync.failed", {
          context: { gameId, op: next.op.kind },
          error: sendError,
        });
        recover(gameId, generation);
        return;
      }
    }

    finishIfOver(gameId, generation);
  }, [commit, finishIfOver, gameId, isCurrent, recover, sessionAtom]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;

    // A finished copy is stale once the summary's Undo has reopened the game, and showing it
    // would send the page straight back to the summary.
    const cached = $gameData.get();
    const hasCachedGame = gameId !== null && cached?.id === gameId && cached.status !== "finished";
    sessionAtom.set(createGameSession(hasCachedGame ? cached : null));
    if (!hasCachedGame) {
      resetGameStore();
    }

    if (gameId !== null) {
      resetGameStateVersion(gameId);
      void loadGame(gameId, generation);
    }

    return () => {
      // Leaving the game drops its unsent throws and silences its late responses (#95).
      generationRef.current += 1;
      controller.abort();
    };
  }, [gameId, loadGame, sessionAtom]);

  const throwDart = useCallback(
    (value: string | number): void => {
      const current = sessionAtom.get();
      let next: GameSession | null;
      try {
        next = enqueueThrow(current, value);
      } catch (throwError) {
        clientLogger.error("game.throw.invalid-value", { context: { gameId }, error: throwError });
        playSound("error");
        return;
      }

      if (next !== null) {
        commit(next);
        void sendNext();
        return;
      }

      // Input was open, yet the shown game has no player to throw for: read it again.
      if (gameId !== null && getSessionView(current).canThrow) {
        clientLogger.error("game.throw.missing-active-player", {
          context: { activePlayerId: getShownGame(current)?.activePlayerId ?? null, gameId },
        });
        recover(gameId, generationRef.current);
      }
    },
    [commit, gameId, recover, sendNext, sessionAtom],
  );

  const undo = useCallback((): void => {
    const current = sessionAtom.get();
    if (!getSessionView(current).canUndo) {
      return;
    }

    commit(enqueueUndo(current));
    playSound("undo");
    void sendNext();
  }, [commit, sendNext, sessionAtom]);

  const retry = useCallback((): void => {
    if (gameId === null) {
      return;
    }

    const current = sessionAtom.get();
    const view = getSessionView(current);
    if (view.isFinishFailed) {
      commit(retrySession(current));
      void sendFinish(gameId, generationRef.current);
      return;
    }
    if (view.canRetry) {
      commit(retrySession(current));
      void reloadAfterFailure(gameId, generationRef.current);
      return;
    }

    void loadGame(gameId, generationRef.current);
  }, [commit, gameId, loadGame, reloadAfterFailure, sendFinish, sessionAtom]);

  const updateSettings = useCallback(
    (settings: GameSettings): void => {
      commit(applySessionSettings(sessionAtom.get(), settings));
    },
    [commit, sessionAtom],
  );

  const sessionView = useMemo(() => getSessionView(session), [session]);
  const commands = useMemo(
    () => ({ throwDart, undo, retry, updateSettings }),
    [retry, throwDart, undo, updateSettings],
  );

  return {
    view: { ...sessionView, game, isLoading, error },
    commands,
  };
}
