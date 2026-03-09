import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { undoLastThrow } from "@/shared/api/game";
import { playSound } from "@/lib/soundPlayer";
import { $gameData, normalizeGameData, setGameData } from "@/store";
import type { GameThrowsResponse } from "@/types";
import { applyOptimisticUndo } from "./throwStateService";

interface UseUndoFlowOptions {
  gameId: number | null;
  reconcileGameState: (message: string) => Promise<void>;
}

interface UseUndoFlowReturn {
  executeUndo: () => Promise<void>;
  isUndoInFlightRef: MutableRefObject<boolean>;
  isUndoPending: boolean;
  resetUndoState: () => void;
}

export function useUndoFlow({ gameId, reconcileGameState }: UseUndoFlowOptions): UseUndoFlowReturn {
  const isUndoInFlightRef = useRef(false);
  const [isUndoPending, setIsUndoPending] = useState(false);

  const resetUndoState = useCallback((): void => {
    isUndoInFlightRef.current = false;
    setIsUndoPending(false);
  }, []);

  const executeUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      return;
    }

    isUndoInFlightRef.current = true;
    setIsUndoPending(true);

    if (!gameId) {
      isUndoInFlightRef.current = false;
      setIsUndoPending(false);
      return;
    }

    try {
      const currentGameData = $gameData.get();
      const optimisticUndoState = currentGameData ? applyOptimisticUndo(currentGameData) : null;
      if (optimisticUndoState) {
        setGameData(optimisticUndoState);
      }

      const updatedGameState: GameThrowsResponse = await undoLastThrow(gameId);
      const normalizedUpdatedGameState = normalizeGameData(updatedGameState);

      if (
        !normalizedUpdatedGameState ||
        typeof normalizedUpdatedGameState.activePlayerId !== "number" ||
        !Number.isFinite(normalizedUpdatedGameState.activePlayerId)
      ) {
        console.error("Undo returned invalid activePlayerId:", updatedGameState.activePlayerId);
        await reconcileGameState("");
      } else {
        setGameData(normalizedUpdatedGameState);
        playSound("undo");
      }
    } catch (error) {
      console.error("Failed to undo throw:", error);
      await reconcileGameState("");
      playSound("error");
    } finally {
      setIsUndoPending(false);
      isUndoInFlightRef.current = false;
    }
  }, [gameId, reconcileGameState]);

  return {
    executeUndo,
    isUndoInFlightRef,
    isUndoPending,
    resetUndoState,
  };
}
