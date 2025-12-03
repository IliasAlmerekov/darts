import { useCallback } from "react";
import { GameThrowsResponse, recordThrow, undoLastThrow } from "../../../services/api";
import { parseThrowValue } from "../../../shared/lib/parseThrowValue";
import { playSound } from "../../../shared/lib/soundPlayer";
import { $gameData, setGameData } from "../../../stores";

interface UseThrowHandlerOptions {
  gameId: number | null;
}

interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
}

export function useThrowHandler({ gameId }: UseThrowHandlerOptions): UseThrowHandlerReturn {
  const handleThrow = useCallback(
    async (value: string | number): Promise<void> => {
      // Read current gameData from store at call time, not at hook creation time
      const currentGameData = $gameData.get();

      if (!gameId || !currentGameData) {
        console.warn("Cannot throw: missing gameId or gameData");
        return;
      }

      const activePlayer = currentGameData.players.find(
        (p) => p.id === currentGameData.activePlayerId,
      );
      if (!activePlayer) {
        console.warn("Cannot throw: no active player found");
        return;
      }

      try {
        const parsedThrow = parseThrowValue(value);

        const updatedGameState: GameThrowsResponse = await recordThrow(gameId, {
          playerId: activePlayer.id,
          value: parsedThrow.value,
          isDouble: parsedThrow.isDouble,
          isTriple: parsedThrow.isTriple,
        });

        console.log("Server response:", updatedGameState);
        console.log(
          "Players roundHistory:",
          updatedGameState.players.map((p) => ({
            name: p.name,
            roundHistory: p.roundHistory,
            throwsInCurrentRound: p.throwsInCurrentRound,
          })),
        );

        // Update store directly with server response
        setGameData(updatedGameState);
        playSound("throw");
      } catch (error) {
        console.error("Failed to record throw:", error);
        playSound("error");
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
      // Update store directly with server response
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
