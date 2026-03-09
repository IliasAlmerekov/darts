import { useCallback, useRef } from "react";
import type { MutableRefObject } from "react";
import { undoLastThrow } from "@/shared/api/game";
import { playSound } from "@/lib/soundPlayer";
import { $gameData, setGameData } from "@/store";
import type { GameThrowsResponse } from "@/types";
import { applyOptimisticUndo } from "./throwStateService";

interface UseUndoFlowOptions {
  gameId: number | null;
}

interface UseUndoFlowReturn {
  executeUndo: () => Promise<void>;
  isUndoInFlightRef: MutableRefObject<boolean>;
  resetUndoState: () => void;
}

export function useUndoFlow({ gameId }: UseUndoFlowOptions): UseUndoFlowReturn {
  const isUndoInFlightRef = useRef(false);

  const resetUndoState = useCallback((): void => {
    isUndoInFlightRef.current = false;
  }, []);

  const executeUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      return;
    }

    isUndoInFlightRef.current = true;

    if (!gameId) {
      isUndoInFlightRef.current = false;
      return;
    }

    try {
      const currentGameData = $gameData.get();
      const optimisticUndoState = currentGameData ? applyOptimisticUndo(currentGameData) : null;
      if (optimisticUndoState) {
        setGameData(optimisticUndoState);
      }

      const updatedGameState: GameThrowsResponse = await undoLastThrow(gameId);
      setGameData(updatedGameState);
      playSound("undo");
    } catch (error) {
      console.error("Failed to undo throw:", error);
      playSound("error");
    } finally {
      isUndoInFlightRef.current = false;
    }
  }, [gameId]);

  return {
    executeUndo,
    isUndoInFlightRef,
    resetUndoState,
  };
}
