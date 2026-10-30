import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { addGuestPlayer, leaveRoom, updatePlayerOrder } from "@/shared/api/room";
import { isApiErrorCode } from "@/lib/error/api-error-code";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { mergePlayerOrder, orderByPosition } from "./lib/playerOrder";
import { useIsCurrentGame } from "./useIsCurrentGame";
import { useCallback, useMemo, useRef, useState } from "react";
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

export type AddGuestResult =
  | { status: "added" }
  | { status: "stale"; error: unknown }
  | { status: "seats-not-editable"; error: unknown }
  | { status: "failed"; error: unknown };

interface UseLobbyRosterResult {
  players: LobbyPlayer[];
  count: number;
  playerOrder: number[];
  addGuest: (gameId: number, username: string) => Promise<AddGuestResult>;
  removePlayer: (playerId: number, gameId: number) => Promise<void>;
  reorderPlayers: (event: DragEndEvent) => void;
}

const NO_PLAYERS: LobbyPlayer[] = [];

/**
 * `onStreamClosed` runs when the room stream ends with `EventSource.CLOSED`, which means the
 * game left the lobby or the backend failed. The stream keeps reconnecting with backoff.
 */
export function useLobbyRoster(
  gameId: number | null,
  onStreamClosed: () => void | Promise<unknown>,
  onError: (message: string) => void,
): UseLobbyRosterResult {
  const queryClient = useQueryClient();
  const isCurrentGame = useIsCurrentGame(gameId);
  const requestIdRef = useRef(0);
  const { data: players = NO_PLAYERS } = useQuery({
    ...gameQueries.lobbyPlayers(gameId ?? 0),
    enabled: gameId !== null,
  });

  const [playerOrder, setPlayerOrder] = useState<number[]>(() => orderByPosition(players));
  const [orderedPlayers, setOrderedPlayers] = useState(players);
  if (orderedPlayers !== players) {
    setOrderedPlayers(players);
    setPlayerOrder((previous) => mergePlayerOrder(previous, players));
  }

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

  const mutateSeat = useCallback(
    async <T>(options: {
      gameId: number;
      request: () => Promise<T>;
      rollback?: () => void;
      shouldRollback?: () => boolean;
      seatsLog?: string;
      failureLog?: string;
    }): Promise<
      | { status: "success"; value: T }
      | { status: "stale" | "seats-not-editable" | "failed"; error: unknown }
    > => {
      try {
        return { status: "success", value: await options.request() };
      } catch (error) {
        if (options.failureLog) clientLogger.warn(options.failureLog, { error });
        if (options.rollback && (!options.shouldRollback || options.shouldRollback()))
          options.rollback();
        const seatsNotEditable = isApiErrorCode(error, "GAME_SEATS_NOT_EDITABLE");
        if (seatsNotEditable && options.seatsLog) {
          clientLogger.warn(options.seatsLog, { context: { gameId: options.gameId }, error });
        }
        if (!isCurrentGame(options.gameId)) return { status: "stale", error };
        if (seatsNotEditable) {
          void onStreamClosed();
          return { status: "seats-not-editable", error };
        }
        return { status: "failed", error };
      }
    },
    [isCurrentGame, onStreamClosed],
  );

  const addGuest = useCallback(
    async (activeGameId: number, username: string): Promise<AddGuestResult> => {
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => addGuestPlayer(activeGameId, { username }),
        seatsLog: "room.guest.seats-not-editable",
      });
      if (result.status === "success") {
        appendOptimisticPlayer(result.value);
        return { status: "added" };
      }
      return result;
    },
    [appendOptimisticPlayer, mutateSeat],
  );

  const removePlayer = useCallback(
    async (playerId: number, activeGameId: number): Promise<void> => {
      const removed = players.find((player) => player.id === playerId);
      removeOptimisticPlayer(playerId);
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => leaveRoom(activeGameId, playerId),
        rollback: () => {
          if (removed) appendOptimisticPlayer(removed);
        },
        seatsLog: "room.leave.seats-not-editable",
      });
      if (result.status === "stale") {
        if (!isApiErrorCode(result.error, "GAME_SEATS_NOT_EDITABLE"))
          clientLogger.warn("room.leave.stale-answer", {
            context: { gameId: activeGameId },
            error: result.error,
          });
      } else if (result.status !== "success") {
        onError(toUserErrorMessage(result.error, "Could not remove player. Please try again."));
      }
    },
    [appendOptimisticPlayer, mutateSeat, onError, players, removeOptimisticPlayer],
  );

  const reorderPlayers = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setPlayerOrder((items) => {
        const activeId = Number(active.id);
        const overId = Number(over.id);
        if (!Number.isFinite(activeId) || !Number.isFinite(overId)) return items;
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return items;
        const nextOrder = arrayMove(items, oldIndex, newIndex);
        if (gameId !== null) {
          const requestId = ++requestIdRef.current;
          void mutateSeat({
            gameId,
            request: () =>
              updatePlayerOrder(
                gameId,
                nextOrder.map((playerId, position) => ({ playerId, position })),
              ),
            rollback: () => setPlayerOrder(items),
            shouldRollback: () => requestIdRef.current === requestId && isCurrentGame(gameId),
            failureLog: "room.player-order.persist.failed",
          }).then((result) => {
            if (result.status !== "success" && result.status !== "stale")
              onError(
                toUserErrorMessage(
                  result.error,
                  "Could not update player order. Please try again.",
                ),
              );
          });
        }
        return nextOrder;
      });
    },
    [gameId, isCurrentGame, mutateSeat, onError],
  );

  useEventSource(url, listeners, { withCredentials: true, onClosed: onStreamClosed });

  return { players, count: players.length, playerOrder, addGuest, removePlayer, reorderPlayers };
}
