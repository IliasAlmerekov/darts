import { useCallback, useEffect, useState } from "react";
import { gameApi } from "@/entities/game";
import { useRoomStream } from "@/entities/room";
import type { GameState } from "@/shared/types";

interface UseGameBoardReturn {
  game: GameState | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGameBoard(gameId: number): UseGameBoardReturn {
  const [game, setGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { event } = useRoomStream(gameId);

  const loadGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await gameApi.getGame(gameId);
      setGame(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!event) return;

    if (
      event.type === "throw-recorded" ||
      event.type === "game-started" ||
      event.type === "game-finished"
    ) {
      setGame(event.data as GameState);
    }
  }, [event]);

  return {
    game,
    isLoading,
    error,
    refresh: loadGame,
  };
}
