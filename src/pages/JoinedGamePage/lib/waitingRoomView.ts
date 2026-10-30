import type { CurrentGame } from "@/lib/player/currentGame";
import { RECENT_GAMES_LIMIT, type PlayerProfile } from "@/lib/player/profile";

/**
 * What the Waiting room shows. A player who had a game in this visit and lost it was
 * removed; one who never had a game has none.
 */
export type WaitingRoomView =
  | { kind: "loading" }
  | Exclude<CurrentGame, { kind: "none" }>
  | { kind: "removed" }
  | { kind: "no-game" };

/** The game the Waiting room names, while the player still has one. */
export function gameIdOf(view: WaitingRoomView): number | null {
  return view.kind === "lobby" || view.kind === "started" ? view.gameId : null;
}

/**
 * Whether the player's finished games prove a removal from the lobby game: it is not among
 * them, and the list is short enough to hold it. Newer games can push it out of a full list.
 */
export function provesRemoval(
  finishedGames: PlayerProfile["history"],
  lobbyGameId: number,
): boolean {
  return (
    finishedGames.length < RECENT_GAMES_LIMIT &&
    !finishedGames.some((game) => game.gameId === lobbyGameId)
  );
}
