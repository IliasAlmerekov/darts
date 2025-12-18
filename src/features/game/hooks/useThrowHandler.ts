import { useCallback, useRef } from "react";
import { GameThrowsResponse, recordThrow, undoLastThrow } from "@/services/api";
import { parseThrowValue } from "@/shared/lib/parseThrowValue";
import { playSound } from "@/shared/lib/soundPlayer";
import { $gameData, setGameData } from "@/stores";

interface UseThrowHandlerOptions {
  gameId: number | null;
}

interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
}

export function useThrowHandler({ gameId }: UseThrowHandlerOptions): UseThrowHandlerReturn {
  const isProcessingRef = useRef(false);

  const handleThrow = useCallback(
    async (value: string | number): Promise<void> => {
      if (isProcessingRef.current) {
        console.warn("Cannot throw: previous throw is still processing");
        return;
      }

      isProcessingRef.current = true;

      try {
        const currentGameData = $gameData.get();

        if (!gameId || !currentGameData) {
          console.warn("Cannot throw: missing gameId or gameData");
          return;
        }

        const activePlayer = currentGameData.players.find(
          (p) => p.id === currentGameData.activePlayerId,
        );

        if (!activePlayer) {
          console.error("Cannot throw: no active player found", {
            activePlayerId: currentGameData.activePlayerId,
            players: currentGameData.players.map((p) => ({
              id: p.id,
              name: p.name,
              score: p.score,
              isActive: p.isActive,
              isBust: p.isBust,
            })),
          });
          return;
        }

        const parsedThrow = parseThrowValue(value);

        const updatedGameState: GameThrowsResponse = await recordThrow(gameId, {
          playerId: activePlayer.id,
          value: parsedThrow.value,
          isDouble: parsedThrow.isDouble,
          isTriple: parsedThrow.isTriple,
        });

        if (!updatedGameState.activePlayerId && updatedGameState.status !== "finished") {
          console.error(
            "Server returned null activePlayerId for non-finished game. This should not happen after the server fix.",
            updatedGameState,
          );
        }

        setGameData(updatedGameState);
      } catch (error) {
        console.error("Failed to record throw:", error);
        playSound("error");
      } finally {
        isProcessingRef.current = false;
      }
    },
    [gameId],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (!gameId) {
      console.warn("Cannot undo: missing gameId");
      return;
    }

    try {
      const updatedGameState: GameThrowsResponse = await undoLastThrow(gameId);
      setGameData(updatedGameState);
      playSound("undo");
    } catch (error) {
      console.error("Failed to undo throw:", error);
      playSound("error");
    }
  }, [gameId]);

  return {
    handleThrow,
    handleUndo,
  };
}
