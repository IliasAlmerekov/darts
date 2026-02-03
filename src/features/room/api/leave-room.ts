import { apiClient } from "@/lib/api";

const ROOM_ENDPOINT = (id: number) => `/room/${id}`;

export async function getGamePlayers(gameId: number) {
  return apiClient.get(ROOM_ENDPOINT(gameId));
}

export async function deletePlayerFromGame(gameId: number, playerId: number) {
  return apiClient.delete(ROOM_ENDPOINT(gameId), { query: { playerId } });
}

export async function leaveRoom(gameId: number, playerId: number): Promise<void> {
  return apiClient.delete(ROOM_ENDPOINT(gameId), { query: { playerId } });
}
