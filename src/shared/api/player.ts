import * as v from "valibot";
import { apiClient } from "./client";
import { integerSchema } from "./schemas";

// Both fields are null when the player has no current game, and both are set otherwise.
const currentGameResponseSchema = v.union([
  v.object({
    gameId: integerSchema,
    status: v.picklist(["lobby", "started"]),
  }),
  v.object({
    gameId: v.null(),
    status: v.null(),
  }),
]);

export type CurrentGameResponse = v.InferOutput<typeof currentGameResponseSchema>;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CURRENT_GAME_ENDPOINT = "/player/current-game";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * Reads the Lobby or Started game the logged-in player currently belongs to.
 */
export async function getCurrentGame(signal?: AbortSignal): Promise<CurrentGameResponse> {
  return apiClient.get(CURRENT_GAME_ENDPOINT, {
    ...(signal ? { signal } : {}),
    validate: currentGameResponseSchema,
  });
}
