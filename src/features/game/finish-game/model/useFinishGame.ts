import { useState } from "react";
import { gameApi } from "@/entities/game";

export function useFinishGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishGame = async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await gameApi.finishGame(gameId);
    } catch (err) {
      setError("Spiel konnte nicht beendet werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { finishGame, loading, error };
}
