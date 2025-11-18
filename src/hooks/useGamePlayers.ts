import { useEffect, useState } from "react";
import { getGamePlayers } from "../services/api";

interface Player {
  id: number;
  name: string;
}

export const useGamePlayers = (gameId: number | null, pollingInterval: number = 3000) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setPlayers([]);
      return;
    }

    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const data = await getGamePlayers(gameId);

        if (data.players && Array.isArray(data.players)) {
          setPlayers(data.players);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch players");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();

    const intervalId = setInterval(fetchPlayers, pollingInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gameId, pollingInterval]);

  return { players, loading, error };
};
