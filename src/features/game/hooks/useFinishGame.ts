import { useState } from "react";
import { getFinishedGame } from "@/services/api";

export function useFinishGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishGame = async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await getFinishedGame(gameId);
    } catch (err) {
      setError("Spiel konnte nicht beendet werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { finishGame, loading, error };
}
