import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { undoLastThrow } from "@/shared/api/game";
import { playSound } from "@/lib/soundPlayer";
import { clientLogger } from "@/shared/lib/clientLogger";
import { normalizeGameData } from "@/shared/lib/gameStateNormalizer";
import { $gameData, setGameData, setGameScoreboardDelta } from "@/shared/store";
import type { GameThrowsResponse, UndoAckResponse } from "@/types";
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

function isUndoAckResponse(
  response: GameThrowsResponse | UndoAckResponse,
): response is UndoAckResponse {
  return "scoreboardDelta" in response;
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

      const undoResponse = await undoLastThrow(gameId);
      if (isUndoAckResponse(undoResponse)) {
        const gameStateBeforePatch = $gameData.get();
        setGameScoreboardDelta(undoResponse.scoreboardDelta, gameId);
        const gameStateAfterPatch = $gameData.get();
        const patchedGameState =
          gameStateBeforePatch !== null &&
          gameStateBeforePatch.id === gameId &&
          gameStateAfterPatch !== null &&
          gameStateAfterPatch.id === gameId
            ? gameStateAfterPatch
            : null;

        if (
          patchedGameState &&
          (patchedGameState.status !== "started" ||
            (typeof patchedGameState.activePlayerId === "number" &&
              Number.isFinite(patchedGameState.activePlayerId)))
        ) {
          playSound("undo");
          return;
        }

        clientLogger.error("game.undo.compact-ack.apply-failed", {
          context: {
            gameId,
            hasPatchedGameState: patchedGameState !== null,
          },
        });
        await reconcileGameState("");
        playSound("undo");
        return;
      }

      const normalizedUpdatedGameState = normalizeGameData(undoResponse);

      if (
        !normalizedUpdatedGameState ||
        typeof normalizedUpdatedGameState.activePlayerId !== "number" ||
        !Number.isFinite(normalizedUpdatedGameState.activePlayerId)
      ) {
        clientLogger.error("game.undo.invalid-active-player-id", {
          context: {
            activePlayerId: undoResponse.activePlayerId,
            gameId,
          },
        });
        await reconcileGameState("");
      } else {
        setGameData(normalizedUpdatedGameState);
        playSound("undo");
      }
    } catch (error) {
      clientLogger.error("game.undo.failed", {
        context: { gameId },
        error,
      });
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
