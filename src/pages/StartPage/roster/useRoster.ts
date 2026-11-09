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
import { readUsernameTaken, type UsernameTaken } from "./usernameTaken";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSource, type EventSourceListener } from "@/shared/hooks/useEventSource";
import { sortRoster, type Seat } from "@/lib/game/roster";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { gameQueries } from "@/shared/query/game.queries";
import { holdRosterOrder, mergeRosterOrder, readRoster, writeRoster } from "@/shared/query/roster";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";

type OptimisticPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

export type AddGuestResult =
  | { status: "added" }
  | { status: "stale"; error: unknown }
  | { status: "seats-not-editable"; error: unknown }
  | { status: "lobby-full"; error: unknown }
  | ({ status: "username-taken" } & UsernameTaken)
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
  const lifecycleRef = useRef(0);
  const pendingReorderRef = useRef<{
    gameId: number;
    requestIds: Set<number>;
    release: () => void;
    overlapped: boolean;
    streamVersion: number;
  } | null>(null);
  const recoveryRef = useRef<AbortController | null>(null);
  const streamVersionRef = useRef(0);
  useIsomorphicLayoutEffect(() => {
    lifecycleRef.current += 1;
    requestIdRef.current += 1;
    pendingReorderRef.current = null;
    return () => {
      lifecycleRef.current += 1;
      recoveryRef.current?.abort();
      recoveryRef.current = null;
      pendingReorderRef.current?.release();
      pendingReorderRef.current = null;
      requestIdRef.current += 1;
    };
  }, [gameId]);
  const { data: players = NO_PLAYERS } = useQuery({
    ...gameQueries.roster(gameId ?? 0),
    enabled: gameId !== null,
  });
  // dnd-kit clears the row transforms in the render that follows a drop, but the query
  // notifies its observers a macrotask later. Until the query data changes, the hook shows
  // the dropped order itself, so no render shows the old order without transforms.
  const [droppedOrder, setDroppedOrder] = useState<{
    gameId: number;
    shownPlayers: Seat[];
    seats: Seat[];
  } | null>(null);
  if (
    droppedOrder !== null &&
    (droppedOrder.gameId !== gameId || droppedOrder.shownPlayers !== players)
  ) {
    setDroppedOrder(null);
  }
  const seats =
    droppedOrder?.gameId === gameId && droppedOrder.shownPlayers === players
      ? droppedOrder.seats
      : players;

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
            return mergeRosterOrder(current, roster);
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

        const nextPlayer: Seat = {
          id: player.id,
          name: player.name,
          position: player.position ?? null,
        };

        return player.position == null
          ? [...currentPlayers, nextPlayer]
          : sortRoster([...currentPlayers, nextPlayer]);
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
      const lifecycle = lifecycleRef.current;
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => addGuestPlayer(activeGameId, payload),
        isRequestCurrent: () => lifecycleRef.current === lifecycle,
        seatsLog: "room.guest.seats-not-editable",
      });
      if (result.status === "success") {
        if (!isCurrentGame(activeGameId) || lifecycleRef.current !== lifecycle)
          return { status: "stale", error: null };
        appendOptimisticPlayer(result.value);
        return { status: "added" };
      }
      const { error } = result;
      const lobbyFull = isApiErrorCode(error, "GAME_ROOM_FULL");
      if (lobbyFull) {
        clientLogger.warn("room.guest.lobby-full", { context: { gameId: activeGameId }, error });
      }
      if (result.status === "stale") {
        if (!result.seatsNotEditable && !lobbyFull && error !== null) {
          clientLogger.warn("room.guest.stale-answer", {
            context: { gameId: activeGameId },
            error,
          });
        }
        return { status: "stale", error };
      }
      if (result.status === "seats-not-editable") return result;
      if (lobbyFull) return { status: "lobby-full", error };
      const usernameTaken = readUsernameTaken(error);
      if (usernameTaken) return { status: "username-taken", ...usernameTaken };
      return result;
    },
    [appendOptimisticPlayer, gameId, isCurrentGame, mutateSeat],
  );

  const removePlayer = useCallback(
    async (playerId: number): Promise<void> => {
      if (gameId === null) return;
      const activeGameId = gameId;
      const lifecycle = lifecycleRef.current;
      const roster =
        queryClient.getQueryData(gameQueries.roster(activeGameId).queryKey) ?? NO_PLAYERS;
      const removedIndex = roster.findIndex((player) => player.id === playerId);
      const removed = roster[removedIndex];
      const streamVersion = streamVersionRef.current;
      removeOptimisticPlayer(playerId);
      const result = await mutateSeat({
        gameId: activeGameId,
        request: () => leaveRoom(activeGameId, playerId),
        rollback: () => {
          if (
            removed &&
            isCurrentGame(activeGameId) &&
            lifecycleRef.current === lifecycle &&
            streamVersionRef.current === streamVersion
          ) {
            updatePlayers((current) => {
              if (current.some((seat) => seat.id === playerId)) return current;
              const restored = [...current];
              restored.splice(removedIndex, 0, removed);
              return restored;
            });
          }
        },
        isRequestCurrent: () => lifecycleRef.current === lifecycle,
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
    [
      gameId,
      isCurrentGame,
      mutateSeat,
      onError,
      queryClient,
      removeOptimisticPlayer,
      updatePlayers,
    ],
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
        recoveryRef.current?.abort();
        recoveryRef.current = null;
        const requestId = ++requestIdRef.current;
        if (pendingReorderRef.current?.gameId !== gameId) {
          const release = holdRosterOrder(gameId, (roster) => {
            streamVersionRef.current += 1;
            updatePlayers((current) => mergeRosterOrder(current, roster));
          });
          pendingReorderRef.current = {
            gameId,
            requestIds: new Set(),
            release,
            overlapped: false,
            streamVersion: streamVersionRef.current,
          };
        }
        if (pendingReorderRef.current.requestIds.size > 0)
          pendingReorderRef.current.overlapped = true;
        pendingReorderRef.current.requestIds.add(requestId);
        const previous = current;
        const ordered = arrayMove(current, oldIndex, newIndex).map((seat, position) => ({
          ...seat,
          position,
        }));
        updatePlayers(() => ordered);
        setDroppedOrder({ gameId, shownPlayers: players, seats: ordered });
        void mutateSeat({
          gameId,
          request: () =>
            updatePlayerOrder(
              gameId,
              nextOrder.map((playerId, position) => ({ playerId, position })),
            ),
          rollback: () => {
            updatePlayers((currentSeats) => mergeRosterOrder(previous, currentSeats));
          },
          shouldRollback: () => requestIdRef.current === requestId && isCurrentGame(gameId),
          isRequestCurrent: () => requestIdRef.current === requestId,
          failureLog: "room.player-order.persist.failed",
        }).then((result) => {
          const pending = pendingReorderRef.current;
          if (pending?.gameId === gameId && pending.requestIds.has(requestId)) {
            pending.requestIds.delete(requestId);
            if (pending.requestIds.size === 0) {
              pending.release();
              pendingReorderRef.current = null;
              if (pending.overlapped && isCurrentGame(gameId)) {
                const controller = new AbortController();
                recoveryRef.current = controller;
                const recoveryRequestId = requestIdRef.current;
                const { queryKey } = gameQueries.roster(gameId);
                const recover = async (): Promise<void> => {
                  try {
                    while (
                      !controller.signal.aborted &&
                      isCurrentGame(gameId) &&
                      requestIdRef.current === recoveryRequestId
                    ) {
                      const version = queryClient.getQueryState(queryKey)?.dataUpdateCount;
                      const streamVersion = streamVersionRef.current;
                      const roster = await readRoster(gameId, controller.signal);
                      if (
                        controller.signal.aborted ||
                        !isCurrentGame(gameId) ||
                        requestIdRef.current !== recoveryRequestId ||
                        streamVersionRef.current !== streamVersion
                      )
                        return;
                      if (queryClient.getQueryState(queryKey)?.dataUpdateCount !== version)
                        continue;
                      const current = queryClient.getQueryData(queryKey) ?? NO_PLAYERS;
                      writeRoster(
                        gameId,
                        streamVersionRef.current === pending.streamVersion
                          ? roster
                          : mergeRosterOrder(roster, current),
                      );
                      return;
                    }
                  } catch (error: unknown) {
                    if (!controller.signal.aborted && isCurrentGame(gameId)) {
                      clientLogger.error("room.player-order.reload.failed", { error });
                      onError(
                        toUserErrorMessage(
                          error,
                          "Could not refresh player order. Please try again.",
                        ),
                      );
                    }
                  } finally {
                    if (recoveryRef.current === controller) recoveryRef.current = null;
                  }
                };
                void recover();
              }
            }
          }
          if (result.status !== "success" && result.status !== "stale")
            onError(
              toUserErrorMessage(result.error, "Could not update player order. Please try again."),
            );
        });
      }
    },
    [gameId, isCurrentGame, mutateSeat, onError, players, queryClient, updatePlayers],
  );

  useEventSource(url, listeners, { withCredentials: true, onClosed: onStreamClosed });

  return { seats, add: addGuest, remove: removePlayer, reorder: reorderPlayers };
}
