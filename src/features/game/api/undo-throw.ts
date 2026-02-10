import { apiClient } from "@/lib/api";
import type { GameThrowsResponse } from "@/types";

const UNDO_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

/**
 * Undoes the last throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function undoLastThrow(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.delete<GameThrowsResponse>(UNDO_THROW_ENDPOINT(gameId));
}
