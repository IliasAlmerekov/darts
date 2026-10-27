import { useCallback, useRef, useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { updatePlayerOrder } from "@/shared/api/room";
import { isApiErrorCode } from "@/lib/error/api-error-code";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { mergePlayerOrder, orderByPosition, type OrderedPlayer } from "./lib/playerOrder";
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

interface UsePlayerOrderPersistenceParams {
  gameId: number | null;
  players: OrderedPlayer[];
  setPageError: SetStartPageError;
  /** Called when the backend refuses the order because the game left the lobby. */
  onSeatsNotEditable: () => void | Promise<unknown>;
}

interface UsePlayerOrderPersistenceResult {
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
  onSeatsNotEditable,
}: UsePlayerOrderPersistenceParams): UsePlayerOrderPersistenceResult {
  const [playerOrder, setPlayerOrder] = useState<number[]>(() => orderByPosition(players));
  const [orderedPlayers, setOrderedPlayers] = useState(players);
  const playerOrderRequestIdRef = useRef(0);

  // A new players list adjusts the order during render, so the list never shows a stale order.
  if (orderedPlayers !== players) {
    setOrderedPlayers(players);
    setPlayerOrder((previousOrder) => mergePlayerOrder(previousOrder, players));
  }

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
              if (isApiErrorCode(error, "GAME_SEATS_NOT_EDITABLE")) {
                void onSeatsNotEditable();
              }
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
    [gameId, onSeatsNotEditable, setPageError],
  );

  return {
    playerOrder,
    handleDragEnd,
  };
}
