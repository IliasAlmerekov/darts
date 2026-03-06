import { useCallback, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { getGameThrowsIfChanged, resetGameStateVersion } from "@/shared/api/game";
import type { GameThrowsResponse } from "@/types";
import { $gameData, $isLoading, $error, setGameData, setLoading, setError } from "@/store";

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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Loads and exposes the current game state from the API and store.
 */
export function useGameState({ gameId }: UseGameStateOptions): UseGameStateReturn {
  const gameData = useStore($gameData);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!gameId) {
      setGameData(null);
      setError(null);
      setLoading(false);
      return;
    }

    resetGameStateVersion(gameId);
    const currentGameData = $gameData.get();
    if (!currentGameData || currentGameData.id !== gameId) {
      setGameData(null);
    }
    setError(null);
  }, [gameId]);

  const fetchGameData = useCallback(
    async (signal?: AbortSignal) => {
      if (!gameId || signal?.aborted) {
        return;
      }

      const requestId = ++requestIdRef.current;
      const hasCachedSnapshot = $gameData.get()?.id === gameId;
      if (!hasCachedSnapshot) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getGameThrowsIfChanged(gameId, signal);
        if (signal?.aborted || requestId !== requestIdRef.current) {
          return;
        }
        if (data) {
          setGameData(data);
        }
      } catch (err) {
        if (isAbortError(err) || signal?.aborted || requestId !== requestIdRef.current) {
          return;
        }
        const fetchError = err instanceof Error ? err : new Error("Failed to fetch game data");
        setError(fetchError);
        console.error("Failed to fetch game data:", fetchError);
      } finally {
        if (requestId === requestIdRef.current && !signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [gameId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchGameData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchGameData]);

  const updateGameData = useCallback((data: GameThrowsResponse) => {
    setGameData(data);
  }, []);

  return {
    gameData,
    isLoading,
    error,
    refetch: () => fetchGameData(),
    updateGameData,
  };
}
