import { useCallback, useEffect, useMemo, useState } from "react";
import { useEventSource } from "@/lib/useEventSource";
import { getGameThrows } from "@/features/game";

interface RawPlayer {
  id: number;
  username?: string;
  name?: string;
  position?: number | null;
}

interface Player {
  id: number;
  name: string;
  position: number | null;
}

type PlayersEventPayload = {
  players?: RawPlayer[];
  items?: RawPlayer[];
};

/**
 * Loads and keeps track of players in a room using SSE + fallback fetch.
 */
export function useGamePlayers(gameId: number | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  const url = useMemo(() => (gameId ? `/api/room/${gameId}/stream` : null), [gameId]);

  // Fetch initial players via game state (fallback when SSE hasn't fired yet)
  useEffect(() => {
    let isMounted = true;

    if (!gameId) {
      setPlayers([]);
      return;
    }

    getGameThrows(gameId)
      .then((response) => {
        if (!isMounted) return;
        const sourcePlayers = response.players ?? [];
        const mappedPlayers = sourcePlayers.map((player) => ({
          id: player.id,
          name: player.name ?? "",
          position: player.position ?? null,
        }));
        const sorted = [...mappedPlayers].sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
        );
        setPlayers(sorted);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const handlePlayers = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as PlayersEventPayload;

      const list = payload.items ?? payload.players;

      if (Array.isArray(list)) {
        if (list.length === 0) {
          setPlayers([]);
          return;
        }

        const mappedPlayers = list.map((player, index) => ({
          id: player.id,
          name: player.username ?? player.name ?? "",
          position: player.position ?? index,
        }));
        const sorted = [...mappedPlayers].sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
        );
        setPlayers(sorted);
      }
    } catch {
      // Ignore invalid SSE payloads
      void 0;
    }
  }, []);

  useEventSource(url, "players", handlePlayers, { withCredentials: true });

  return { players, count: players.length };
}
