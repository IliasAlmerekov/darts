import { useState } from "react";
import { recordThrow as recordThrowRequest } from "../api";
import type { ThrowRequest } from "@/types/api";

/**
 * Provides record-throw action scoped to a game.
 */
export function useRecordThrow(gameId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordThrow = async (data: ThrowRequest) => {
    setLoading(true);
    setError(null);

    try {
      const updatedGame = await recordThrowRequest(gameId, data);
      return updatedGame;
    } catch (err) {
      setError("Wurf konnte nicht registriert werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { recordThrow, loading, error };
}
