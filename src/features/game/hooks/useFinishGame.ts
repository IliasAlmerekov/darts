import { useState } from "react";
import { finishGame as finishGameRequest } from "../api";

/**
 * Provides finish-game action with loading/error state.
 */
export function useFinishGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishGame = async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await finishGameRequest(gameId);
    } catch (err) {
      setError("Spiel konnte nicht beendet werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { finishGame, loading, error };
}
