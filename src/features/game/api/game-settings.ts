import { apiClient } from "@/lib/api";
import type { GameThrowsResponse } from "./record-throw";

const CREATE_GAME_SETTINGS_ENDPOINT = "/game/settings";
const GAME_SETTINGS_ENDPOINT = (id: number) => `/game/${id}/settings`;

export type CreateGameSettingsPayload = {
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
};

type UpdateGameSettingsPayload = Partial<{
  doubleOut: boolean;
  tripleOut: boolean;
}>;

export async function createGameSettings(
  payload: CreateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.post(CREATE_GAME_SETTINGS_ENDPOINT, payload);
}

export async function updateGameSettings(
  gameId: number,
  payload: UpdateGameSettingsPayload,
): Promise<GameThrowsResponse> {
  return apiClient.patch(GAME_SETTINGS_ENDPOINT(gameId), payload);
}

export async function saveGameSettings(
  payload: CreateGameSettingsPayload,
  gameId?: number | null,
): Promise<GameThrowsResponse> {
  if (gameId) {
    return updateGameSettings(gameId, payload);
  }
  return createGameSettings(payload);
}
