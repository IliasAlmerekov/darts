import type { CurrentGameResponse } from "@/shared/api/player";

/** The game the server says a player belongs to. */
export type CurrentGame =
  | { kind: "none" }
  | { kind: "lobby"; gameId: number }
  | { kind: "started"; gameId: number };

/**
 * Reads the current-game answer. The contract lets either field be null on its own: without
 * a game id there is no game, and a game without a status is still waiting in the lobby.
 */
export function toCurrentGame(response: CurrentGameResponse): CurrentGame {
  if (response.gameId === null) {
    return { kind: "none" };
  }
  return response.status === "started"
    ? { kind: "started", gameId: response.gameId }
    : { kind: "lobby", gameId: response.gameId };
}
