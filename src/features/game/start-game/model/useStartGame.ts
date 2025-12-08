import { useState } from "react";
import { gameApi } from "@/entities/game";
import type { StartGameRequest } from "@/shared/types";

export function useStartGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = async (gameId: number, data: StartGameRequest) => {
    setLoading(true);
    setError(null);

    try {
      const game = await gameApi.startGame(gameId, data);
      return game;
    } catch (err) {
      setError("Spielstart fehlgeschlagen");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { startGame, loading, error };
}
