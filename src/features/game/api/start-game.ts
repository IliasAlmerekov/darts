import { apiClient } from "@/lib/api";
import type { StartGameRequest } from "@/types";

const START_GAME_ENDPOINT = (id: number) => `/game/${id}/start`;

export async function startGame(gameId: number, config: StartGameRequest) {
  return apiClient.post(START_GAME_ENDPOINT(gameId), {
    status: config.status,
    round: config.round,
    startscore: config.startScore,
    doubleout: config.doubleOut,
    tripleout: config.tripleOut,
  });
}
