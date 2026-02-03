import { apiClient } from "@/lib/api";

const UPDATE_PLAYER_ORDER_ENDPOINT = (id: number) => `/room/${id}/positions`;

export async function updatePlayerOrder(
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
): Promise<void> {
  return apiClient.post(UPDATE_PLAYER_ORDER_ENDPOINT(gameId), { positions });
}
