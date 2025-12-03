import { useCallback, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { GameThrowsResponse, getGameThrows } from "../services/api";
import { $gameData, $isLoading, $error, setGameData, setLoading, setError } from "../stores";

interface UseGameStateOptions {
  gameId: number | null;
}

interface UseGameStateReturn {
  gameData: GameThrowsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateGameData: (data: GameThrowsResponse) => void;
}

export function useGameState({ gameId }: UseGameStateOptions): UseGameStateReturn {
  const gameData = useStore($gameData);
  const isLoading = useStore($isLoading);
  const error = useStore($error);

  const fetchGameData = useCallback(async () => {
    if (!gameId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getGameThrows(gameId);
      setGameData(data);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error("Failed to fetch game data");
      setError(fetchError);
      console.error("Failed to fetch game data:", fetchError);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial fetch when gameId changes
  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  // Note: No need to refetch on SSE events - recordThrow already returns full game state
  // SSE events from other clients will be handled by SSE connection updates

  const updateGameData = useCallback((data: GameThrowsResponse) => {
    setGameData(data);
  }, []);

  return {
    gameData,
    isLoading,
    error,
    refetch: fetchGameData,
    updateGameData,
  };
}
