import { useCallback, useMemo, useState } from "react";
import { useEventSource } from "./useEventSource";

interface Player {
  id: number;
  name: string;
}

type PlayersEventPayload = {
  players?: Player[];
};

export const useGamePlayers = (gameId: number | null) => {
  const [players, setPlayers] = useState<Player[]>([]);

  const url = useMemo(() => (gameId ? `/api/room/${gameId}/stream` : null), [gameId]);

  const handlePlayers = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as PlayersEventPayload;

      if (Array.isArray(payload.players)) {
        setPlayers(payload.players);
      }
    } catch (error) {
      console.error("[useGamePlayers] Failed to parse players event data:", error);
    }
  }, []);

  useEventSource(url, "players", handlePlayers, { withCredentials: true });

  return { players, count: players.length };
};
