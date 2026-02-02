import { useState } from "react";
import { undoLastThrow } from "@/services/api";

export function useUndoThrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const undoThrow = async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedGame = await undoLastThrow(gameId);
      return updatedGame;
    } catch (err) {
      setError("Letzter Wurf konnte nicht rückgängig gemacht werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { undoThrow, loading, error };
}
