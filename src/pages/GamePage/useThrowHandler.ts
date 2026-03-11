import { useCallback, useEffect } from "react";
import { parseThrowValue } from "@/lib/parseThrowValue";
import { playSound } from "@/lib/soundPlayer";
import { clientLogger } from "@/shared/lib/clientLogger";
import { $gameData, setGameData } from "@/store";
import { applyOptimisticThrow } from "./throwStateService";
import { isThrowNotAllowedConflict, useThrowReconciliation } from "./useThrowReconciliation";
import { useThrowQueue } from "./useThrowQueue";
import { useUndoFlow } from "./useUndoFlow";

interface UseThrowHandlerOptions {
  gameId: number | null;
}

interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
  pendingThrowCount: number;
  isQueueFull: boolean;
  syncMessage: string | null;
  clearSyncMessage: () => void;
  isUndoPending: boolean;
}

export { isThrowNotAllowedConflict };

/**
 * Provides throw and undo handlers for the active game.
 */
export function useThrowHandler({ gameId }: UseThrowHandlerOptions): UseThrowHandlerReturn {
  const { syncMessage, updateSyncMessage, clearSyncMessage, reconcileGameState } =
    useThrowReconciliation({ gameId });
  const { executeUndo, isUndoInFlightRef, isUndoPending, resetUndoState } = useUndoFlow({
    gameId,
    reconcileGameState,
  });
  const {
    pendingThrowCount,
    isQueueFull,
    isQueueAtCapacity,
    hasPendingThrows,
    captureConfirmedState,
    enqueueThrow,
    drainQueue,
    requestUndoAfterSync,
    resetQueueState,
  } = useThrowQueue({
    gameId,
    executeUndo,
    reconcileGameState,
  });

  useEffect(() => {
    resetQueueState();
    updateSyncMessage(null);
    resetUndoState();
  }, [gameId, resetQueueState, resetUndoState, updateSyncMessage]);

  const handleThrow = useCallback(
    async (value: string | number): Promise<void> => {
      if (isUndoInFlightRef.current) {
        clientLogger.warn("game.throw.blocked.undo-in-flight");
        return;
      }

      try {
        updateSyncMessage(null);
        const currentGameData = $gameData.get();

        if (!gameId || !currentGameData) {
          clientLogger.warn("game.throw.blocked.missing-context", {
            context: {
              hasGameData: currentGameData !== null,
              hasGameId: gameId !== null,
            },
          });
          return;
        }

        const activePlayer = currentGameData.players.find(
          (player) => player.id === currentGameData.activePlayerId,
        );

        if (!activePlayer) {
          clientLogger.error("game.throw.missing-active-player", {
            context: {
              activePlayerId: currentGameData.activePlayerId,
              gameId,
              playerCount: currentGameData.players.length,
            },
          });
          await reconcileGameState("Game state was out of sync. Refreshed latest game state.");
          playSound("error");
          return;
        }

        if (isQueueAtCapacity()) {
          updateSyncMessage("Throw queue is full. Wait until current throws are synchronized.");
          return;
        }

        if (!hasPendingThrows()) {
          captureConfirmedState(currentGameData);
        }

        const parsedThrow = parseThrowValue(value);
        const optimisticState = applyOptimisticThrow(currentGameData, parsedThrow, activePlayer.id);
        if (!optimisticState) {
          clientLogger.error("game.throw.optimistic-state.failed", {
            context: {
              activePlayerId: activePlayer.id,
              gameId,
              throwValue: parsedThrow.value,
            },
          });
          return;
        }

        setGameData(optimisticState);
        enqueueThrow({
          playerId: activePlayer.id,
          value: parsedThrow.value,
          isDouble: parsedThrow.isDouble,
          isTriple: parsedThrow.isTriple,
        });
        void drainQueue();
      } catch (error) {
        clientLogger.error("game.throw.record.failed", {
          context: { gameId },
          error,
        });
        await reconcileGameState("Throw failed. Refreshed game state from server.");
        playSound("error");
      }
    },
    [
      captureConfirmedState,
      drainQueue,
      enqueueThrow,
      gameId,
      hasPendingThrows,
      isQueueAtCapacity,
      isUndoInFlightRef,
      reconcileGameState,
      updateSyncMessage,
    ],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      clientLogger.warn("game.undo.blocked.undo-in-flight");
      return;
    }

    if (hasPendingThrows()) {
      requestUndoAfterSync();
      updateSyncMessage("Applying undo after current throw sync.");
      return;
    }

    if (!gameId) {
      clientLogger.warn("game.undo.blocked.missing-game-id");
      return;
    }

    await executeUndo();
  }, [
    executeUndo,
    gameId,
    hasPendingThrows,
    isUndoInFlightRef,
    requestUndoAfterSync,
    updateSyncMessage,
  ]);

  return {
    handleThrow,
    handleUndo,
    pendingThrowCount,
    isQueueFull,
    syncMessage,
    clearSyncMessage,
    isUndoPending,
  };
}
