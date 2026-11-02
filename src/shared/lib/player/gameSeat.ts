import type { GameSeatResponse } from "@/shared/api/player";

/** What became of the player's seat in a game they belonged to. */
export type SeatOutcome = "seated" | "removed" | "over";

/**
 * Reads the seat lookup. Only a game that still runs without the player is a removal; a
 * finished or aborted game is over, whatever its seats say.
 */
export function toSeatOutcome(response: GameSeatResponse): SeatOutcome {
  if (response.status === "finished" || response.status === "aborted") {
    return "over";
  }
  return response.seated ? "seated" : "removed";
}
