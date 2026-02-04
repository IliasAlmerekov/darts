import { apiClient } from "@/lib/api";

const ROOM_ENDPOINT = (id: number) => `/room/${id}`;

/**
 * Fetches players for the given game room.
 */
export async function getGamePlayers(gameId: number) {
  return apiClient.get(ROOM_ENDPOINT(gameId));
}

/**
 * Removes a player from the game room.
 */
export async function deletePlayerFromGame(gameId: number, playerId: number) {
  return apiClient.delete(ROOM_ENDPOINT(gameId), { query: { playerId } });
}

/**
 * Leaves a game room as a specific player.
 */
export async function leaveRoom(gameId: number, playerId?: number): Promise<void> {
  const query = typeof playerId === "number" ? { playerId } : undefined;
  return apiClient.delete(ROOM_ENDPOINT(gameId), query ? { query } : undefined);
}
