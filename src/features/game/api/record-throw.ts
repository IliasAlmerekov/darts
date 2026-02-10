import { apiClient } from "@/lib/api";
import type { GameThrowsResponse, ThrowRequest } from "@/types";

const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw`;

/**
 * Records a throw and returns the complete updated game state.
 * No need for a separate GET request after this - the response contains full GameThrowsResponse.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<GameThrowsResponse> {
  return apiClient.post<GameThrowsResponse>(RECORD_THROW_ENDPOINT(gameId), payload);
}
