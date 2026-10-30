import type { GameThrowsResponse } from "@/shared/api/game";

export interface LobbyPlayer {
  id: number;
  name: string;
  position: number | null;
}

/** Orders players by position. Players without a position go last. */
export function sortLobbyPlayers(players: readonly LobbyPlayer[]): LobbyPlayer[] {
  return [...players].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
  );
}

/** The players of a game state as lobby players, in position order. */
export function toLobbyPlayers(players: GameThrowsResponse["players"]): LobbyPlayer[] {
  return sortLobbyPlayers(
    players.map((player) => ({
      id: player.id,
      name: player.name ?? "",
      position: player.position ?? null,
    })),
  );
}
