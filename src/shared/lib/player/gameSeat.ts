import type { GameSeatResponse } from "@/shared/api/player";

/** The player's place in a game they belonged to. */
export type GameSeat = "seated" | "removed" | "over";

/**
 * Reads the seat lookup. Only a game that still runs without the player is a removal; a
 * finished or aborted game is over, whatever its seats say.
 */
export function toGameSeat(response: GameSeatResponse): GameSeat {
  if (response.status === "finished" || response.status === "aborted") {
    return "over";
  }
  return response.seated ? "seated" : "removed";
}
