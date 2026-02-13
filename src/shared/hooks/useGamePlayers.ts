import { useCallback, useEffect, useMemo, useState } from "react";
import { useEventSource } from "@/hooks/useEventSource";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import { $gameData } from "@/stores";

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

type OptimisticPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

type PlayersEventPayload = {
  players?: RawPlayer[];
  items?: RawPlayer[];
};

export function useGamePlayers(gameId: number | null) {
  const gameFlow = useGameFlowPort();
  const [players, setPlayers] = useState<Player[]>(() => {
    if (!gameId) {
      return [];
    }

    const cachedGameData = $gameData.get();
    if (!cachedGameData || cachedGameData.id !== gameId) {
      return [];
    }

    const cachedPlayers = cachedGameData.players.map((player) => ({
      id: player.id,
      name: player.name ?? "",
      position: player.position ?? null,
    }));
    return cachedPlayers.sort(
      (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    );
  });

  const sortPlayers = useCallback((list: Player[]): Player[] => {
    return [...list].sort(
      (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    );
  }, []);

  const url = useMemo(() => (gameId ? `/api/room/${gameId}/stream` : null), [gameId]);

  useEffect(() => {
    let isMounted = true;

    if (!gameId) {
      setPlayers([]);
      return;
    }

    const cachedGameData = $gameData.get();
    if (cachedGameData && cachedGameData.id === gameId) {
      const cachedPlayers = cachedGameData.players.map((player) => ({
        id: player.id,
        name: player.name ?? "",
        position: player.position ?? null,
      }));
      setPlayers(sortPlayers(cachedPlayers));
    }

    gameFlow
      .getGameThrows(gameId)
      .then((response) => {
        if (!isMounted) return;
        const sourcePlayers = response.players ?? [];
        const mappedPlayers = sourcePlayers.map((player) => ({
          id: player.id,
          name: player.name ?? "",
          position: player.position ?? null,
        }));
        setPlayers(sortPlayers(mappedPlayers));
      })
      .catch(() => {
        // Ignore transient room fetch errors; SSE can still populate players.
      });

    return () => {
      isMounted = false;
    };
  }, [gameFlow, gameId, sortPlayers]);

  const handlePlayers = useCallback(
    (event: MessageEvent<string>) => {
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
          setPlayers(sortPlayers(mappedPlayers));
        }
      } catch {
        // Ignore invalid SSE payloads.
      }
    },
    [sortPlayers],
  );

  const appendOptimisticPlayer = useCallback(
    (player: OptimisticPlayer): void => {
      setPlayers((currentPlayers) => {
        if (currentPlayers.some((existingPlayer) => existingPlayer.id === player.id)) {
          return currentPlayers;
        }

        const fallbackPosition =
          currentPlayers.length > 0
            ? Math.max(...currentPlayers.map((existingPlayer) => existingPlayer.position ?? 0)) + 1
            : 0;
        const nextPlayer: Player = {
          id: player.id,
          name: player.name,
          position: player.position ?? fallbackPosition,
        };

        return sortPlayers([...currentPlayers, nextPlayer]);
      });
    },
    [sortPlayers],
  );

  const removeOptimisticPlayer = useCallback((playerId: number): void => {
    setPlayers((currentPlayers) =>
      currentPlayers.filter((existingPlayer) => existingPlayer.id !== playerId),
    );
  }, []);

  useEventSource(url, "players", handlePlayers, { withCredentials: true });

  return { players, count: players.length, appendOptimisticPlayer, removeOptimisticPlayer };
}
