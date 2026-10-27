import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSource, type EventSourceListener } from "@/shared/hooks/useEventSource";
import { sortLobbyPlayers, type LobbyPlayer } from "@/lib/game/lobbyPlayers";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { gameQueries } from "@/shared/query/game.queries";

interface RawPlayer {
  id: number;
  username?: string;
  name?: string;
  position?: number | null;
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

interface UseGamePlayersResult {
  players: LobbyPlayer[];
  count: number;
  appendOptimisticPlayer: (player: OptimisticPlayer) => void;
  removeOptimisticPlayer: (playerId: number) => void;
}

const NO_PLAYERS: LobbyPlayer[] = [];

/**
 * `onStreamClosed` runs when the room stream ends with `EventSource.CLOSED`, which means the
 * game left the lobby or the backend failed. The stream keeps reconnecting with backoff.
 */
export function useGamePlayers(
  gameId: number | null,
  onStreamClosed?: () => void,
): UseGamePlayersResult {
  const queryClient = useQueryClient();
  const { data: players = NO_PLAYERS } = useQuery({
    ...gameQueries.lobbyPlayers(gameId ?? 0),
    enabled: gameId !== null,
  });

  const updatePlayers = useCallback(
    (update: (currentPlayers: LobbyPlayer[]) => LobbyPlayer[]): void => {
      if (gameId === null) {
        return;
      }
      const { queryKey } = gameQueries.lobbyPlayers(gameId);
      // A read still in flight started before this write, so its response would be older.
      void queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, (currentPlayers) => update(currentPlayers ?? NO_PLAYERS));
    },
    [gameId, queryClient],
  );

  const url = useMemo(() => (gameId !== null ? `/api/room/${gameId}/stream` : null), [gameId]);

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
          const mappedPlayers = list.map((player, index) => ({
            id: player.id,
            name: player.username ?? player.name ?? "",
            position: player.position ?? index,
          }));
          updatePlayers(() => sortLobbyPlayers(mappedPlayers));
        }
      } catch (error) {
        clientLogger.error("room.players.sse-parse.failed", {
          context: { raw: event.data },
          error,
        });
      }
    },
    [updatePlayers],
  );

  const listeners = useMemo<readonly EventSourceListener[]>(() => {
    return [{ event: "players", handler: handlePlayers }];
  }, [handlePlayers]);

  const appendOptimisticPlayer = useCallback(
    (player: OptimisticPlayer): void => {
      updatePlayers((currentPlayers) => {
        if (currentPlayers.some((existingPlayer) => existingPlayer.id === player.id)) {
          return currentPlayers;
        }

        const fallbackPosition =
          currentPlayers.length > 0
            ? Math.max(...currentPlayers.map((existingPlayer) => existingPlayer.position ?? 0)) + 1
            : 0;
        const nextPlayer: LobbyPlayer = {
          id: player.id,
          name: player.name,
          position: player.position ?? fallbackPosition,
        };

        return sortLobbyPlayers([...currentPlayers, nextPlayer]);
      });
    },
    [updatePlayers],
  );

  const removeOptimisticPlayer = useCallback(
    (playerId: number): void => {
      updatePlayers((currentPlayers) =>
        currentPlayers.filter((existingPlayer) => existingPlayer.id !== playerId),
      );
    },
    [updatePlayers],
  );

  useEventSource(url, listeners, { withCredentials: true, onClosed: onStreamClosed });

  return { players, count: players.length, appendOptimisticPlayer, removeOptimisticPlayer };
}
