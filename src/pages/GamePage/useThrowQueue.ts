import { useCallback, useRef, useState } from "react";
import { recordThrow, setGameStateVersion } from "@/shared/api/game";
import type { ThrowRequest } from "@/types";
import { playSound } from "@/lib/soundPlayer";
import { $gameData, setGameData } from "@/store";
import { applyScoreboardDeltaToGameState } from "./throwStateService";
import { isThrowNotAllowedConflict } from "./useThrowReconciliation";

const MAX_PENDING_THROWS = 3;

type ThrowQueueItem = {
  request: ThrowRequest;
};

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
    syncPendingCount();
  }, [syncPendingCount]);

  const isQueueAtCapacity = useCallback((): boolean => {
    return pendingQueueRef.current.length >= MAX_PENDING_THROWS;
  }, []);

  const hasPendingThrows = useCallback((): boolean => {
    return pendingQueueRef.current.length > 0;
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
    if (!gameId || isDrainingRef.current) {
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

          if (pendingQueueRef.current.length === 0) {
            const latestGameState = $gameData.get();
            if (latestGameState) {
              setGameData(
                applyScoreboardDeltaToGameState(latestGameState, throwAck.scoreboardDelta),
              );
            }
          }
        } catch (error) {
          console.error("Failed to sync queued throw:", error);
          isQueueSyncFailedRef.current = true;
          clearQueue();

          if (isThrowNotAllowedConflict(error)) {
            await reconcileGameState(
              "Game state changed in another session. Synced latest game state.",
            );
          } else {
            await reconcileGameState("Could not sync throws. Refreshed game state from server.");
          }

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
    enqueueThrow,
    drainQueue,
    requestUndoAfterSync,
    resetQueueState,
  };
}
