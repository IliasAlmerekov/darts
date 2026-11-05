export interface Seat {
  id: number;
  name: string;
  position: number | null;
}

/** Orders players by position. Players without a position go last. */
export function sortRoster(players: readonly Seat[]): Seat[] {
  return [...players].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Maps server players to seats in position order. */
export function toRoster(
  players: readonly {
    id: number;
    name?: string | null | undefined;
    username?: string | null | undefined;
    position?: number | null | undefined;
  }[],
): Seat[] {
  return sortRoster(
    players.map((player) => ({
      id: player.id,
      name: player.username ?? player.name ?? "",
      position: player.position ?? null,
    })),
  );
}
