import { apiClient } from "@/lib/api";

const ABORT_GAME_ENDPOINT = (id: number) => `/game/${id}/abort`;

/**
 * Aborts the specified game on the server.
 */
export async function abortGame(gameId: number): Promise<{ message: string }> {
  return apiClient.patch(ABORT_GAME_ENDPOINT(gameId));
}
