import { useState } from "react";
import { gameApi } from "@/entities/game";
import type { ThrowRequest } from "@/shared/types";

export function useRecordThrow(gameId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordThrow = async (data: ThrowRequest) => {
    setLoading(true);
    setError(null);

    try {
      const updatedGame = await gameApi.recordThrow(gameId, data);
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
