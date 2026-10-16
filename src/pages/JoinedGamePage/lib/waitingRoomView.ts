import type { CurrentGame } from "@/shared/lib/player/currentGame";

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
