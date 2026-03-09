import { useCallback, useEffect } from "react";
import { parseThrowValue } from "@/lib/parseThrowValue";
import { playSound } from "@/lib/soundPlayer";
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
        console.warn("Cannot throw: undo is still processing");
        return;
      }

      try {
        updateSyncMessage(null);
        const currentGameData = $gameData.get();

        if (!gameId || !currentGameData) {
          console.warn("Cannot throw: missing gameId or gameData");
          return;
        }

        const activePlayer = currentGameData.players.find(
          (player) => player.id === currentGameData.activePlayerId,
        );

        if (!activePlayer) {
          console.error("Cannot throw: no active player found", {
            activePlayerId: currentGameData.activePlayerId,
            players: currentGameData.players.map((player) => ({
              id: player.id,
              name: player.name,
              score: player.score,
              isActive: player.isActive,
              isBust: player.isBust,
            })),
          });
          return;
        }

        if (isQueueAtCapacity()) {
          updateSyncMessage("Throw queue is full. Wait until current throws are synchronized.");
          return;
        }

        const parsedThrow = parseThrowValue(value);
        const optimisticState = applyOptimisticThrow(currentGameData, parsedThrow, activePlayer.id);
        if (!optimisticState) {
          console.error("Cannot throw: failed to build optimistic game state");
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
        console.error("Failed to record throw:", error);
        await reconcileGameState("Throw failed. Refreshed game state from server.");
        playSound("error");
      }
    },
    [
      drainQueue,
      enqueueThrow,
      gameId,
      isQueueAtCapacity,
      isUndoInFlightRef,
      reconcileGameState,
      updateSyncMessage,
    ],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      console.warn("Cannot undo: previous undo action is still processing");
      return;
    }

    if (hasPendingThrows()) {
      requestUndoAfterSync();
      updateSyncMessage("Applying undo after current throw sync.");
      return;
    }

    if (!gameId) {
      console.warn("Cannot undo: missing gameId");
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
