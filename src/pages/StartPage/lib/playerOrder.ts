export interface OrderedPlayer {
  id: number;
  position: number | null;
}

/** Player ids sorted by lobby position; players without a position go last. */
export function orderByPosition(players: OrderedPlayer[]): number[] {
  return [...players]
    .sort(
      (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    )
    .map((player) => player.id);
}

/** Keeps the order the admin dragged, drops players who left, and appends new players. */
export function mergePlayerOrder(previousOrder: number[], players: OrderedPlayer[]): number[] {
  const idsByPosition = orderByPosition(players);
  if (previousOrder.length <= 0 || idsByPosition.length <= 0) {
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
}
