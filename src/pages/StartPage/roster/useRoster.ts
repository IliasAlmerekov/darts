import { arrayMove } from "@dnd-kit/sortable";
import {
  addGuestPlayer,
  leaveRoom,
  updatePlayerOrder,
  type AddGuestPayload,
} from "@/shared/api/room";
import { isApiErrorCode } from "@/lib/error/api-error-code";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { parsePlayersEvent } from "@/shared/api/room";
import { useIsCurrentGame } from "../lib/useIsCurrentGame";
import { useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSource, type EventSourceListener } from "@/shared/hooks/useEventSource";
import { sortRoster, type Seat } from "@/lib/game/roster";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { gameQueries } from "@/shared/query/game.queries";
import { writeRoster } from "@/shared/query/roster";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";

type OptimisticPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

export type AddGuestResult =
  | { status: "added" }
  | { status: "stale"; error: unknown; seatsNotEditable?: true }
  | { status: "seats-not-editable"; error: unknown }
  | { status: "failed"; error: unknown };

interface UseRosterResult {
  seats: Seat[];
  add: (payload: AddGuestPayload) => Promise<AddGuestResult>;
  remove: (playerId: number) => Promise<void>;
  reorder: (playerId: number, overPlayerId: number) => void;
}

const NO_PLAYERS: Seat[] = [];

/**
 * `onStreamClosed` runs when the room stream ends with `EventSource.CLOSED`, which means the
 * game left the lobby or the backend failed. The stream keeps reconnecting with backoff.
 */
export function useRoster(
  gameId: number | null,
  {
    onStreamClosed,
    onError,
  }: { onStreamClosed: () => void | Promise<unknown>; onError: (message: string) => void },
): UseRosterResult {
  const queryClient = useQueryClient();
  const isCurrentGame = useIsCurrentGame(gameId);
  const requestIdRef = useRef(0);
  const pendingReorderRef = useRef<{ gameId: number; requestIds: Set<number> } | null>(null);
  const streamVersionRef = useRef(0);
  useIsomorphicLayoutEffect(() => {
    requestIdRef.current += 1;
    pendingReorderRef.current = null;
  }, [gameId]);
  const { data: players = NO_PLAYERS } = useQuery({
    ...gameQueries.roster(gameId ?? 0),
    enabled: gameId !== null,
  });

  const updatePlayers = useCallback(
    (update: (currentPlayers: Seat[]) => Seat[]): void => {
      if (gameId === null) {
        return;
      }
      const { queryKey } = gameQueries.roster(gameId);
      const currentPlayers = queryClient.getQueryData(queryKey) ?? NO_PLAYERS;
      writeRoster(gameId, update(currentPlayers));
    },
    [gameId, queryClient],
  );

  const url = useMemo(() => (gameId !== null ? `/api/room/${gameId}/stream` : null), [gameId]);

  const handlePlayers = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const roster = parsePlayersEvent(JSON.parse(event.data));
        if (roster === "invalid") {
          clientLogger.error("room.players.sse-invalid-payload", {
            context: { raw: event.data },
          });
          return;
        }
        if (roster !== "no-roster") {
          streamVersionRef.current += 1;
          updatePlayers((current) => {
            if (pendingReorderRef.current?.gameId !== gameId) return roster;
            const incoming = new Map(roster.map((seat) => [seat.id, seat]));
            const kept = current.flatMap((seat) => {
              const updated = incoming.get(seat.id);
              incoming.delete(seat.id);
              return updated ? [updated] : [];
            });
            return [...kept, ...incoming.values()].map((seat, position) => ({ ...seat, position }));
          });
        }
      } catch (error) {
        clientLogger.error("room.players.sse-parse.failed", {
          context: { raw: event.data },
          error,
        });
      }
    },
    [gameId, updatePlayers],
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
        const nextPlayer: Seat = {
          id: player.id,
          name: player.name,
          position: player.position ?? fallbackPosition,
        };

        return sortRoster([...currentPlayers, nextPlayer]);
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
      isRequestCurrent?: () => boolean;
      seatsLog?: string;
      failureLog?: string;
    }): Promise<
      | { status: "success"; value: T }
      | { status: "stale"; error: unknown; seatsNotEditable?: true }
      | { status: "seats-not-editable" | "failed"; error: unknown }
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
        if (
          !isCurrentGame(options.gameId) ||
          (options.isRequestCurrent && !options.isRequestCurrent())
        )
          return seatsNotEditable
            ? { status: "stale", error, seatsNotEditable: true }
            : { status: "stale", error };
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
    async (payload: AddGuestPayload): Promise<AddGuestResult> => {
      if (gameId === null) return { status: "failed", error: new Error("No active game") };
      const activeGameId = gameId;
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => addGuestPlayer(activeGameId, payload),
        seatsLog: "room.guest.seats-not-editable",
      });
      if (result.status === "success") {
        if (!isCurrentGame(activeGameId)) return { status: "stale", error: null };
        appendOptimisticPlayer(result.value);
        return { status: "added" };
      }
      return result;
    },
    [appendOptimisticPlayer, gameId, isCurrentGame, mutateSeat],
  );

  const removePlayer = useCallback(
    async (playerId: number): Promise<void> => {
      if (gameId === null) return;
      const activeGameId = gameId;
      const removed = queryClient
        .getQueryData(gameQueries.roster(activeGameId).queryKey)
        ?.find((player) => player.id === playerId);
      const streamVersion = streamVersionRef.current;
      removeOptimisticPlayer(playerId);
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => leaveRoom(activeGameId, playerId),
        rollback: () => {
          if (removed && streamVersionRef.current === streamVersion)
            appendOptimisticPlayer(removed);
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
        if (result.status === "failed") {
          clientLogger.error("room.leave.failed", {
            context: { gameId: activeGameId },
            error: result.error,
          });
        }
        onError(toUserErrorMessage(result.error, "Could not remove player. Please try again."));
      }
    },
    [appendOptimisticPlayer, gameId, mutateSeat, onError, queryClient, removeOptimisticPlayer],
  );

  const reorderPlayers = useCallback(
    (activeId: number, overId: number): void => {
      if (activeId === overId) return;
      if (gameId === null) return;
      const current = queryClient.getQueryData(gameQueries.roster(gameId).queryKey) ?? NO_PLAYERS;
      const items = current.map(({ id }) => id);
      if (!Number.isFinite(activeId) || !Number.isFinite(overId)) return;
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextOrder = arrayMove(items, oldIndex, newIndex);
      if (gameId !== null) {
        const requestId = ++requestIdRef.current;
        if (pendingReorderRef.current?.gameId !== gameId) {
          pendingReorderRef.current = { gameId, requestIds: new Set() };
        }
        pendingReorderRef.current.requestIds.add(requestId);
        const previous = current;
        const ordered = arrayMove(current, oldIndex, newIndex).map((seat, position) => ({
          ...seat,
          position,
        }));
        updatePlayers(() => ordered);
        void mutateSeat({
          gameId,
          request: () =>
            updatePlayerOrder(
              gameId,
              nextOrder.map((playerId, position) => ({ playerId, position })),
            ),
          rollback: () => {
            updatePlayers((currentSeats) => {
              const incoming = new Map(currentSeats.map((seat) => [seat.id, seat]));
              const kept = previous.flatMap((seat) => {
                const updated = incoming.get(seat.id);
                incoming.delete(seat.id);
                return updated ? [updated] : [];
              });
              return [...kept, ...incoming.values()].map((seat, position) => ({
                ...seat,
                position,
              }));
            });
          },
          shouldRollback: () => requestIdRef.current === requestId && isCurrentGame(gameId),
          isRequestCurrent: () => requestIdRef.current === requestId,
          failureLog: "room.player-order.persist.failed",
        }).then((result) => {
          const pending = pendingReorderRef.current;
          if (pending?.gameId === gameId) {
            pending.requestIds.delete(requestId);
            if (pending.requestIds.size === 0) pendingReorderRef.current = null;
          }
          if (result.status !== "success" && result.status !== "stale")
            onError(
              toUserErrorMessage(result.error, "Could not update player order. Please try again."),
            );
        });
      }
    },
    [gameId, isCurrentGame, mutateSeat, onError, queryClient, updatePlayers],
  );

  useEventSource(url, listeners, { withCredentials: true, onClosed: onStreamClosed });

  return { seats: players, add: addGuest, remove: removePlayer, reorder: reorderPlayers };
}
