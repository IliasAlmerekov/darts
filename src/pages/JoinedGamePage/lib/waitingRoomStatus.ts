import type { CurrentGameResponse } from "@/shared/api/player";

export type WaitingRoomStatus =
  | { kind: "loading" }
  | { kind: "waiting"; gameId: number }
  | { kind: "started"; gameId: number }
  | { kind: "removed" }
  | { kind: "no-game" };

/**
 * Turns the current-game answer into what the Waiting room shows. A player who had a game
 * in this visit and lost it was removed; one who never had a game has none.
 */
export function toWaitingRoomStatus(
  currentGame: CurrentGameResponse | undefined,
  hasSeenGame: boolean,
): WaitingRoomStatus {
  if (currentGame === undefined) {
    return { kind: "loading" };
  }
  if (currentGame.gameId === null) {
    return hasSeenGame ? { kind: "removed" } : { kind: "no-game" };
  }
  return currentGame.status === "started"
    ? { kind: "started", gameId: currentGame.gameId }
    : { kind: "waiting", gameId: currentGame.gameId };
}
