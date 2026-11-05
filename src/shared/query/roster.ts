import { toRoster, type Seat } from "@/lib/game/roster";
import { getGameThrows } from "@/shared/api/game";
import { gameQueries } from "./game.queries";
import { queryClient } from "./queryClient";

const pendingReorders = new Map<number, (seats: Seat[]) => void>();

export function mergeRosterOrder(order: Seat[], members: Seat[]): Seat[] {
  const incoming = new Map(members.map((seat) => [seat.id, seat]));
  const kept = order.flatMap((seat) => {
    const updated = incoming.get(seat.id);
    incoming.delete(seat.id);
    return updated ? [updated] : [];
  });
  return [...kept, ...incoming.values()].map((seat, position) => ({ ...seat, position }));
}

export async function readRoster(gameId: number, signal: AbortSignal): Promise<Seat[]> {
  return toRoster((await getGameThrows(gameId, signal)).players);
}

export function holdRosterOrder(gameId: number, reconcile: (seats: Seat[]) => void): () => void {
  pendingReorders.set(gameId, reconcile);
  return () => {
    if (pendingReorders.get(gameId) === reconcile) pendingReorders.delete(gameId);
  };
}

export function writeServerRoster(gameId: number, seats: Seat[]): void {
  const reconcile = pendingReorders.get(gameId);
  if (reconcile) reconcile(seats);
  else writeRoster(gameId, seats);
}

export function writeRoster(gameId: number, seats: Seat[]): void {
  const { queryKey } = gameQueries.roster(gameId);
  void queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(queryKey, seats);
}
