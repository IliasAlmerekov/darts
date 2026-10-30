import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { useQueryClient } from "@tanstack/react-query";
import { atom } from "nanostores";
import {
  finishGame,
  getGameThrows,
  getGameThrowsIfChanged,
  recordThrow,
  resetGameStateVersion,
  setGameStateVersion,
  undoLastThrow,
  type GameSettings,
  type GameThrowsResponse,
} from "@/shared/api/game";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { gameQueries } from "@/shared/query/game.queries";
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
import {
  applyReloadedGame,
  applySessionSettings,
  applyThrowAck,
  applyUndoResponse,
  closeFinishOverlay,
  createGameSession,
  markGameFinished,
  undoFromOverlay,
  enqueueThrow,
  enqueueUndo,
  failSession,
  getSessionView,
  getShownGame,
  markFirstLoadFailed,
  markSessionOffline,
  retrySession,
  takeNextOp,
  toThrowRequest,
  type GameSession,
  type GameSessionView,
} from "./lib/gameSession.logic";

interface GameSessionPageView extends GameSessionView {
  game: GameThrowsResponse | null;
  isLoading: boolean;
  error: Error | null;
  isInteractionDisabled: boolean;
  isUndoDisabled: boolean;
  isSettingsDisabled: boolean;
  /** The overlay's Finish game request runs; the overlay's actions wait for it. */
  isFinishPending: boolean;
  finishError: string | null;
}

interface GameSessionCommands {
  throwDart: (value: string | number) => void;
  undo: () => void;
  continueGame: () => void;
  undoFromOverlay: () => void;
  /** Ends the game on the server once every tap is acknowledged, then reports it finished. */
  finishGame: () => void;
  /** Reloads the game after a failed first load or after the server could not be reached. */
  retry: () => void;
  updateSettings: (settings: GameSettings) => void;
}

interface UseGameSessionResult {
  view: GameSessionPageView;
  commands: GameSessionCommands;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Owns the game on screen: it loads the game, keeps the optimistic throw queue of ADR 0003 and
 * is the only writer of the game store while the game page is open. Every response carries the
 * session generation; one that arrives after the page left the game is ignored.
 */
export function useGameSession(gameId: number | null): UseGameSessionResult {
  // Local to this hook, so each game page instance starts with its own queue.
  const [sessionAtom] = useState(() => atom<GameSession>(createGameSession(null)));
  const session = useStore(sessionAtom);
  const game = useStore($gameData);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  const queryClient = useQueryClient();
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  // The game whose finish request runs, or ran and succeeded while the page moves away. The ref
  // is the synchronous lock against a second tap; the state mirrors it for rendering.
  const finishingGameIdRef = useRef<number | null>(null);
  const [finishState, setFinishState] = useState<{
    gameId: number;
    isPending: boolean;
    error: string | null;
  } | null>(null);
  // Finish state belongs to the game it ran for, so it never follows a game change.
  const finish = finishState?.gameId === gameId ? finishState : null;

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
          commit(applyReloadedGame(sessionAtom.get(), data));
        }
      } catch (loadError) {
        if (!isCurrent(generation) || isAbortError(loadError)) {
          return;
        }
        const fetchError =
          loadError instanceof Error ? loadError : new Error("Failed to fetch game data");
        clientLogger.error("game.fetch.failed", { context: { gameId: id }, error: fetchError });
        // A copy from an earlier page keeps the scoreboard on screen, so the status line offers
        // Retry instead of the page error.
        const current = sessionAtom.get();
        if (current.confirmed !== null) {
          commit(markFirstLoadFailed(current));
          return;
        }
        setError(fetchError);
      } finally {
        if (isCurrent(generation)) {
          setLoading(false);
        }
      }
    },
    [commit, isCurrent, sessionAtom],
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
    [commit, isCurrent, sessionAtom],
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
  }, [commit, gameId, isCurrent, recover, sessionAtom]);

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

  const isFinishing = useCallback(
    (): boolean => gameId !== null && finishingGameIdRef.current === gameId,
    [gameId],
  );

  const continueGame = useCallback((): void => {
    if (isFinishing()) {
      return;
    }
    setFinishState(null);
    commit(closeFinishOverlay(sessionAtom.get()));
  }, [commit, isFinishing, sessionAtom]);

  const handleUndoFromOverlay = useCallback((): void => {
    if (isFinishing()) {
      return;
    }
    setFinishState(null);
    const current = sessionAtom.get();
    const next = undoFromOverlay(current);
    commit(next);
    if (next.pending === current.pending) return;
    playSound("undo");
    void sendNext();
  }, [commit, isFinishing, sendNext, sessionAtom]);

  const handleFinishGame = useCallback(async (): Promise<void> => {
    if (gameId === null || isFinishing() || !getSessionView(sessionAtom.get()).canFinishGame) {
      return;
    }

    const generation = generationRef.current;
    finishingGameIdRef.current = gameId;
    setFinishState({ gameId, isPending: true, error: null });
    const release = (): void => {
      if (finishingGameIdRef.current === gameId) {
        finishingGameIdRef.current = null;
      }
    };

    try {
      const summary = await finishGame(gameId, controllerRef.current?.signal);
      if (!isCurrent(generation)) {
        release();
        return;
      }
      // The summary reads this entry, so it opens without a second request.
      const { queryKey } = gameQueries.finished(gameId);
      void queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, summary);
      commit(markGameFinished(sessionAtom.get()));
    } catch (finishError) {
      release();
      if (!isCurrent(generation) || isAbortError(finishError)) {
        return;
      }
      clientLogger.error("game.finish.failed", { context: { gameId }, error: finishError });
      setFinishState({
        gameId,
        isPending: false,
        error: toUserErrorMessage(finishError, "Could not finish the game. Please try again."),
      });
    }
  }, [commit, gameId, isCurrent, isFinishing, queryClient, sessionAtom]);

  const retry = useCallback((): void => {
    if (gameId === null) {
      return;
    }

    const current = sessionAtom.get();
    commit(retrySession(current));
    if (current.recovery === "offline") {
      void reloadAfterFailure(gameId, generationRef.current);
      return;
    }

    void loadGame(gameId, generationRef.current);
  }, [commit, gameId, loadGame, reloadAfterFailure, sessionAtom]);

  const updateSettings = useCallback(
    (settings: GameSettings): void => {
      commit(applySessionSettings(sessionAtom.get(), settings));
    },
    [commit, sessionAtom],
  );

  const sessionView = useMemo(() => getSessionView(session), [session]);
  const commands = useMemo(
    () => ({
      throwDart,
      undo,
      retry,
      updateSettings,
      continueGame,
      undoFromOverlay: handleUndoFromOverlay,
      finishGame: () => void handleFinishGame(),
    }),
    [retry, throwDart, undo, updateSettings, continueGame, handleUndoFromOverlay, handleFinishGame],
  );

  return {
    view: {
      ...sessionView,
      game,
      isLoading,
      error,
      isInteractionDisabled: isLoading || !!error || !game || !sessionView.canThrow,
      isUndoDisabled: isLoading || !!error || !game || !sessionView.canUndo,
      isSettingsDisabled: !sessionView.canOpenSettings,
      isFinishPending: finish?.isPending ?? false,
      finishError: finish?.error ?? null,
    },
    commands,
  };
}
