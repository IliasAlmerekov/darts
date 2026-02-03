import { apiClient } from "@/lib/api";
import type { GameThrowsResponse } from "./record-throw";

const GET_GAME_ENDPOINT = (id: number) => `/game/${id}`;

export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  return apiClient.get(GET_GAME_ENDPOINT(gameId));
}
