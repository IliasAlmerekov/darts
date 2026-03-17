import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { useEventSource, type EventSourceListener } from "@/shared/hooks/useEventSource";
import { getGameThrows } from "@/shared/api/game";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { $gameData } from "@/shared/store";

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

function isRawPlayer(value: unknown): value is RawPlayer {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "number"
  );
}

function isPlayersEventPayload(value: unknown): value is PlayersEventPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if ("players" in obj && !Array.isArray(obj.players)) {
    return false;
  }
  if ("items" in obj && !Array.isArray(obj.items)) {
    return false;
  }
  const list = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.players)
      ? obj.players
      : null;
  return list === null || list.every(isRawPlayer);
}

export interface UseGamePlayersResult {
  players: Player[];
  count: number;
  appendOptimisticPlayer: (player: OptimisticPlayer) => void;
  removeOptimisticPlayer: (playerId: number) => void;
}

export function useGamePlayers(gameId: number | null): UseGamePlayersResult {
  const gameData = useStore($gameData);

  const mapStorePlayers = useCallback((sourcePlayers: RawPlayer[]) => {
    return sourcePlayers
      .map((player) => ({
        id: player.id,
        name: player.name ?? "",
        position: player.position ?? null,
      }))
      .sort(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
      );
  }, []);

  const [players, setPlayers] = useState<Player[]>(() => {
    if (gameId === null) {
      return [];
    }

    if (!gameData || gameData.id !== gameId) {
      return [];
    }

    return mapStorePlayers(gameData.players);
  });

  const sortPlayers = useCallback((list: Player[]): Player[] => {
    return [...list].sort(
      (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    );
  }, []);

  const url = useMemo(() => (gameId !== null ? `/api/room/${gameId}/stream` : null), [gameId]);

  useEffect(() => {
    if (gameId === null) {
      setPlayers([]);
      return;
    }

    if (!gameData || gameData.id !== gameId) {
      return;
    }

    setPlayers(mapStorePlayers(gameData.players));
  }, [gameId, gameData, mapStorePlayers]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (gameId === null) {
      setPlayers([]);
      return;
    }

    getGameThrows(gameId, controller.signal)
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
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        clientLogger.error("room.players.fetch.failed", {
          context: { gameId },
          error,
        });
      });

    return () => {
      controller.abort();
      isMounted = false;
    };
  }, [gameId, sortPlayers]);

  const handlePlayers = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isPlayersEventPayload(parsed)) {
          clientLogger.error("room.players.sse-invalid-payload", {
            context: { raw: event.data },
          });
          return;
        }
        const payload = parsed;
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
      } catch (error) {
        clientLogger.error("room.players.sse-parse.failed", {
          context: { raw: event.data },
          error,
        });
      }
    },
    [sortPlayers],
  );

  const listeners = useMemo<readonly EventSourceListener[]>(() => {
    return [{ event: "players", handler: handlePlayers }];
  }, [handlePlayers]);

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

  useEventSource(url, listeners, { withCredentials: true });

  return { players, count: players.length, appendOptimisticPlayer, removeOptimisticPlayer };
}
