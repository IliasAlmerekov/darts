import { useCallback, useEffect, useMemo, useState } from "react";
import { useEventSource } from "./useEventSource";
import { getGamePlayersWithUserInfo } from "@/services/api";

interface RawPlayer {
  id: number;
  username?: string;
  name?: string;
}

interface Player {
  id: number;
  name: string;
}

type PlayersEventPayload = {
  players?: RawPlayer[];
  items?: RawPlayer[];
};

export function useGamePlayers(gameId: number | null, previousGameId?: number | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  const url = useMemo(() => (gameId ? `/api/room/${gameId}/stream` : null), [gameId]);

  // Fetch initial players (e.g., when creating a room from a finished game)
  useEffect(() => {
    let isMounted = true;

    // Load players from previousGameId if no active game, otherwise from current game
    const sourceGameId = previousGameId && !gameId ? previousGameId : gameId;

    if (!sourceGameId) {
      setPlayers([]);
      return;
    }

    getGamePlayersWithUserInfo(sourceGameId)
      .then((response) => {
        if (!isMounted) return;
        const sourcePlayers = response.items ?? response.players ?? [];
        const mappedPlayers = sourcePlayers.map((player) => ({
          id: player.id,
          name: player.username ?? "",
        }));
        setPlayers(mappedPlayers);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [gameId, previousGameId]);

  const handlePlayers = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as PlayersEventPayload;

      const list = payload.items ?? payload.players;

      if (Array.isArray(list)) {
        // Skip empty SSE payloads to avoid overriding preloaded players
        if (list.length === 0) return;

        const mappedPlayers = list.map((player) => ({
          id: player.id,
          name: player.username ?? player.name ?? "",
        }));
        setPlayers(mappedPlayers);
      }
    } catch {
      // Ignore invalid SSE payloads
      void 0;
    }
  }, []);

  useEventSource(url, "players", handlePlayers, { withCredentials: true });

  return { players, count: players.length };
}
