import { useState } from "react";
import { roomApi } from "@/entities/room";

export function useRematch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rematch = async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await roomApi.createRematch(gameId);
    } catch (err) {
      setError("Rematch konnte nicht erstellt werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { rematch, loading, error };
}
