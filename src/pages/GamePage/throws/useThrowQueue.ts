import { useCallback, useRef, useState } from "react";
import { recordThrow, setGameStateVersion } from "@/shared/api/game";
import { clientLogger } from "@/lib/clientLogger";
import type { GameThrowsResponse, ThrowRequest } from "@/types";
import { playSound } from "@/shared/services/browser/soundPlayer";
import { $gameData, setGameData } from "@/shared/store";
import { applyScoreboardDeltaToGameState } from "./throwStateService";
import { isThrowNotAllowedConflict } from "./useThrowReconciliation";

const MAX_PENDING_THROWS = 3;

interface ThrowQueueItem {
  request: ThrowRequest;
}

interface TurnRollbackDetectionOptions {
  confirmedBaseState: GameThrowsResponse;
  latestGameState: GameThrowsResponse;
  acknowledgedGameState: GameThrowsResponse;
}

function didServerRollbackCompletedTurn({
  confirmedBaseState,
  latestGameState,
  acknowledgedGameState,
}: TurnRollbackDetectionOptions): boolean {
  if (latestGameState.status !== "started" || acknowledgedGameState.status !== "started") {
    return false;
  }

  if (latestGameState.currentThrowCount !== 0) {
    return false;
  }

  if (
    latestGameState.activePlayerId === null ||
    acknowledgedGameState.activePlayerId === null ||
    confirmedBaseState.activePlayerId === null
  ) {
    return false;
  }

  return (
    latestGameState.activePlayerId !== acknowledgedGameState.activePlayerId &&
    latestGameState.activePlayerId !== confirmedBaseState.activePlayerId &&
    acknowledgedGameState.activePlayerId === confirmedBaseState.activePlayerId
  );
}

interface UseThrowQueueOptions {
  gameId: number | null;
  executeUndo: () => Promise<void>;
  reconcileGameState: (message: string) => Promise<void>;
}

interface UseThrowQueueReturn {
  pendingThrowCount: number;
  isQueueFull: boolean;
  isQueueAtCapacity: () => boolean;
  hasPendingThrows: () => boolean;
  captureConfirmedState: (state: GameThrowsResponse | null) => void;
  enqueueThrow: (request: ThrowRequest) => void;
  drainQueue: () => Promise<void>;
  requestUndoAfterSync: () => void;
  resetQueueState: () => void;
}

export function useThrowQueue({
  gameId,
  executeUndo,
  reconcileGameState,
}: UseThrowQueueOptions): UseThrowQueueReturn {
  const pendingQueueRef = useRef<ThrowQueueItem[]>([]);
  const isDrainingRef = useRef(false);
  const isQueueSyncFailedRef = useRef(false);
  const pendingUndoRequestRef = useRef(false);
  const confirmedGameStateRef = useRef<GameThrowsResponse | null>(null);
  const [pendingThrowCount, setPendingThrowCount] = useState(0);

  const syncPendingCount = useCallback((): void => {
    setPendingThrowCount(pendingQueueRef.current.length);
  }, []);

  const clearQueue = useCallback((): void => {
    pendingQueueRef.current = [];
    pendingUndoRequestRef.current = false;
    syncPendingCount();
  }, [syncPendingCount]);

  const resetQueueState = useCallback((): void => {
    pendingQueueRef.current = [];
    isDrainingRef.current = false;
    isQueueSyncFailedRef.current = false;
    pendingUndoRequestRef.current = false;
    confirmedGameStateRef.current = null;
    syncPendingCount();
  }, [syncPendingCount]);

  const isQueueAtCapacity = useCallback((): boolean => {
    return pendingQueueRef.current.length >= MAX_PENDING_THROWS;
  }, []);

  const hasPendingThrows = useCallback((): boolean => {
    return pendingQueueRef.current.length > 0;
  }, []);

  const captureConfirmedState = useCallback((state: GameThrowsResponse | null): void => {
    confirmedGameStateRef.current = state;
  }, []);

  const enqueueThrow = useCallback(
    (request: ThrowRequest): void => {
      pendingQueueRef.current.push({ request });
      syncPendingCount();
    },
    [syncPendingCount],
  );

  const requestUndoAfterSync = useCallback((): void => {
    pendingUndoRequestRef.current = true;
  }, []);

  const drainQueue = useCallback(async (): Promise<void> => {
    if (gameId === null || isDrainingRef.current) {
      return;
    }

    isDrainingRef.current = true;
    isQueueSyncFailedRef.current = false;

    try {
      while (pendingQueueRef.current.length > 0) {
        const nextThrow = pendingQueueRef.current[0];
        if (!nextThrow) {
          break;
        }

        try {
          const throwAck = await recordThrow(gameId, nextThrow.request);
          if (!throwAck.success) {
            throw new Error("Throw request was not accepted by server");
          }

          setGameStateVersion(gameId, throwAck.stateVersion);
          pendingQueueRef.current.shift();
          syncPendingCount();

          const confirmedBaseState = confirmedGameStateRef.current ?? $gameData.get();
          if (!confirmedBaseState) {
            continue;
          }

          const confirmedGameState = applyScoreboardDeltaToGameState(
            confirmedBaseState,
            throwAck.scoreboardDelta,
          );
          confirmedGameStateRef.current = confirmedGameState;

          if (pendingQueueRef.current.length === 0) {
            const latestGameState = $gameData.get();
            if (latestGameState) {
              const acknowledgedGameState = applyScoreboardDeltaToGameState(
                latestGameState,
                throwAck.scoreboardDelta,
              );

              if (
                didServerRollbackCompletedTurn({
                  confirmedBaseState,
                  latestGameState,
                  acknowledgedGameState,
                })
              ) {
                clientLogger.warn("game.throw.queue-sync.turn-rollback-detected", {
                  context: {
                    acknowledgedActivePlayerId: acknowledgedGameState.activePlayerId,
                    confirmedActivePlayerId: confirmedBaseState.activePlayerId,
                    gameId,
                    optimisticActivePlayerId: latestGameState.activePlayerId,
                  },
                });

                isQueueSyncFailedRef.current = true;
                await reconcileGameState(
                  "Received inconsistent turn update from server. Refreshed latest game state.",
                );
                confirmedGameStateRef.current = $gameData.get();
                playSound("error");
                break;
              }

              setGameData(acknowledgedGameState);
            }
            continue;
          }

          const nextQueuedPlayerId = pendingQueueRef.current[0]?.request.playerId ?? null;
          if (
            nextQueuedPlayerId !== null &&
            confirmedGameState.activePlayerId !== null &&
            nextQueuedPlayerId !== confirmedGameState.activePlayerId
          ) {
            clientLogger.warn("game.throw.queue-sync.rebase-failed", {
              context: {
                confirmedActivePlayerId: confirmedGameState.activePlayerId,
                gameId,
                nextQueuedPlayerId,
                pendingThrowCount: pendingQueueRef.current.length,
              },
            });

            isQueueSyncFailedRef.current = true;
            clearQueue();
            await reconcileGameState(
              "Game state changed while throws were syncing. Cleared queued throws and synced latest turn.",
            );
            confirmedGameStateRef.current = $gameData.get();
            playSound("error");
            break;
          }
        } catch (error) {
          clientLogger.error("game.throw.queue-sync.failed", {
            context: { gameId },
            error,
          });
          isQueueSyncFailedRef.current = true;
          clearQueue();

          if (isThrowNotAllowedConflict(error)) {
            await reconcileGameState(
              "Game state changed in another session. Synced latest game state.",
            );
          } else {
            await reconcileGameState("Could not sync throws. Refreshed game state from server.");
          }

          confirmedGameStateRef.current = $gameData.get();
          playSound("error");
          break;
        }
      }
    } finally {
      isDrainingRef.current = false;

      if (
        pendingUndoRequestRef.current &&
        !isQueueSyncFailedRef.current &&
        pendingQueueRef.current.length === 0
      ) {
        pendingUndoRequestRef.current = false;
        void executeUndo();
      }
    }
  }, [clearQueue, executeUndo, gameId, reconcileGameState, syncPendingCount]);

  return {
    pendingThrowCount,
    isQueueFull: pendingThrowCount >= MAX_PENDING_THROWS,
    isQueueAtCapacity,
    hasPendingThrows,
    captureConfirmedState,
    enqueueThrow,
    drainQueue,
    requestUndoAfterSync,
    resetQueueState,
  };
}
