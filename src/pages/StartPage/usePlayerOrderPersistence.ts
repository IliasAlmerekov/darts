import { useCallback, useEffect, useRef, useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { updatePlayerOrder } from "@/shared/api/room";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import type { SetStartPageError } from "./useStartPageError";

type UpdatePlayerOrderFn = (
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
) => Promise<void>;

interface PersistPlayerOrderParams {
  gameId: number;
  nextOrder: number[];
  previousOrder: number[];
  updatePlayerOrder: UpdatePlayerOrderFn;
  onError: (error: unknown) => void;
  onRollback: (order: number[]) => void;
  shouldRollback: () => boolean;
}

interface OrderedPlayer {
  id: number;
  position: number | null;
}

interface UsePlayerOrderPersistenceParams {
  gameId: number | null;
  players: OrderedPlayer[];
  setPageError: SetStartPageError;
}

export interface UsePlayerOrderPersistenceResult {
  playerOrder: number[];
  handleDragEnd: (event: DragEndEvent) => void;
}

export async function persistPlayerOrder({
  gameId,
  nextOrder,
  previousOrder,
  updatePlayerOrder,
  onError,
  onRollback,
  shouldRollback,
}: PersistPlayerOrderParams): Promise<void> {
  const positionsPayload = nextOrder.map((playerId, position) => ({
    playerId,
    position,
  }));

  try {
    await updatePlayerOrder(gameId, positionsPayload);
  } catch (error) {
    onError(error);
    if (shouldRollback()) {
      onRollback(previousOrder);
    }
  }
}

/**
 * Tracks lobby player order and persists drag-and-drop changes to the backend.
 */
export function usePlayerOrderPersistence({
  gameId,
  players,
  setPageError,
}: UsePlayerOrderPersistenceParams): UsePlayerOrderPersistenceResult {
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);
  const playerOrderRequestIdRef = useRef(0);

  useEffect(() => {
    if (players.length <= 0) {
      setPlayerOrder([]);
      return;
    }

    const idsByPosition = [...players]
      .sort(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
      )
      .map((player) => player.id);

    setPlayerOrder((previousOrder) => {
      if (previousOrder.length <= 0) {
        return idsByPosition;
      }

      const knownIds = new Set(idsByPosition);
      const preservedOrder = previousOrder.filter((playerId) => knownIds.has(playerId));
      const newIds = idsByPosition.filter((playerId) => !preservedOrder.includes(playerId));
      const nextOrder = [...preservedOrder, ...newIds];

      if (
        nextOrder.length === previousOrder.length &&
        nextOrder.every((playerId, index) => playerId === previousOrder[index])
      ) {
        return previousOrder;
      }

      return nextOrder;
    });
  }, [players]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      setPlayerOrder((items) => {
        const activeId = Number(active.id);
        const overId = Number(over.id);
        if (!Number.isFinite(activeId) || !Number.isFinite(overId)) {
          return items;
        }
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }

        const nextOrder = arrayMove(items, oldIndex, newIndex);

        if (gameId !== null) {
          const requestId = ++playerOrderRequestIdRef.current;

          void persistPlayerOrder({
            gameId,
            nextOrder,
            previousOrder: items,
            updatePlayerOrder,
            onError: (error) => {
              clientLogger.warn("room.player-order.persist.failed", { error });
              setPageError(
                toUserErrorMessage(error, "Could not update player order. Please try again."),
              );
            },
            onRollback: (order) => {
              setPlayerOrder(order);
            },
            shouldRollback: () => playerOrderRequestIdRef.current === requestId,
          });
        }

        return nextOrder;
      });
    },
    [gameId, setPageError],
  );

  return {
    playerOrder,
    handleDragEnd,
  };
}
