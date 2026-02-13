import { apiClient } from "@/lib/api";
import type { ThrowAckResponse, ThrowRequest } from "@/types";

const RECORD_THROW_ENDPOINT = (id: number) => `/game/${id}/throw/delta`;

/**
 * Records a throw and returns compact server acknowledgement with scoreboard delta.
 */
export async function recordThrow(
  gameId: number,
  payload: ThrowRequest,
): Promise<ThrowAckResponse> {
  return apiClient.post<ThrowAckResponse>(RECORD_THROW_ENDPOINT(gameId), payload);
}
