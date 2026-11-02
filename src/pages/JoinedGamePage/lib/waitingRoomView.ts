import type { CurrentGame } from "@/lib/player/currentGame";

/**
 * What the Waiting room shows. A player whose last game still runs without them was
 * removed; one whose game is over, or who never had one, has none.
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
