import { useCallback, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { getGameThrowsIfChanged, resetGameStateVersion, type GameThrowsResponse } from "../api";
import { $gameData, $isLoading, $error, setGameData, setLoading, setError } from "@/stores";

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

/**
 * Loads and exposes the current game state from the API and store.
 */
export function useGameState({ gameId }: UseGameStateOptions): UseGameStateReturn {
  const gameData = useStore($gameData);
  const isLoading = useStore($isLoading);
  const error = useStore($error);

  useEffect(() => {
    if (!gameId) {
      setGameData(null);
      setError(null);
      return;
    }

    resetGameStateVersion(gameId);
    const currentGameData = $gameData.get();
    if (!currentGameData || currentGameData.id !== gameId) {
      setGameData(null);
    }
    setError(null);
  }, [gameId]);

  const fetchGameData = useCallback(async () => {
    if (!gameId) return;
    const hasCachedSnapshot = $gameData.get()?.id === gameId;
    if (!hasCachedSnapshot) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getGameThrowsIfChanged(gameId);
      if (data) {
        setGameData(data);
      }
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error("Failed to fetch game data");
      setError(fetchError);
      console.error("Failed to fetch game data:", fetchError);
    } finally {
      if (!hasCachedSnapshot) {
        setLoading(false);
      }
    }
  }, [gameId]);

  useEffect(() => {
    void fetchGameData();
  }, [fetchGameData]);

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
