/** The game the server says a player belongs to. */
export type CurrentGame =
  | { kind: "none" }
  | { kind: "lobby"; gameId: number }
  | { kind: "started"; gameId: number };

interface CurrentGameDto {
  gameId: number | null;
  status: "lobby" | "started" | null;
}

/**
 * Reads the current-game answer. The contract lets either field be null on its own: without
 * a game id there is no game, and a game without a status is still waiting in the lobby.
 */
export function toCurrentGame(dto: CurrentGameDto): CurrentGame {
  if (dto.gameId === null) {
    return { kind: "none" };
  }
  return dto.status === "started"
    ? { kind: "started", gameId: dto.gameId }
    : { kind: "lobby", gameId: dto.gameId };
}
