import { apiClient } from "@/lib/api";
import type { GameThrowsResponse } from "@/types";

const REOPEN_GAME_ENDPOINT = (id: number) => `/game/${id}/reopen`;

/**
 * Reopens a finished game and returns the updated game state.
 */
export async function reopenGame(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.patch<GameThrowsResponse>(REOPEN_GAME_ENDPOINT(gameId));
}
