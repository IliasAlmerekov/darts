import { apiClient } from "@/lib/api";

const FINISHED_GAME_ENDPOINT = (id: number) => `/game/${id}/finished`;
const FINISH_GAME_ENDPOINT = (id: number) => `/game/${id}/finish`;

export type FinishedPlayerResponse = {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
};

/**
 * Fetches final standings for a finished game.
 */
export async function getFinishedGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.get(FINISHED_GAME_ENDPOINT(gameId));
}

/**
 * Marks a game as finished and returns final standings.
 */
export async function finishGame(gameId: number): Promise<FinishedPlayerResponse[]> {
  return apiClient.post(FINISH_GAME_ENDPOINT(gameId));
}
