import type { Seat } from "@/lib/game/roster";
import { gameQueries } from "./game.queries";
import { queryClient } from "./queryClient";

export function writeRoster(gameId: number, seats: Seat[]): void {
  const { queryKey } = gameQueries.roster(gameId);
  void queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(queryKey, seats);
}
