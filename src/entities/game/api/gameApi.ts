import { apiClient } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/shared/api/config";
import type { StartGameRequest, ThrowRequest } from "@/shared/types/api";
import type { GameState } from "@/shared/types/game";
import type { GameFinishResponse } from "../model/types";

export const gameApi = {
  getGame: async (gameId: number): Promise<GameState> => {
    return apiClient.get<GameState>(API_ENDPOINTS.GET_GAME(gameId));
  },

  startGame: async (gameId: number, data: StartGameRequest): Promise<GameState> => {
    return apiClient.post<GameState>(API_ENDPOINTS.START_GAME(gameId), data);
  },

  recordThrow: async (gameId: number, data: ThrowRequest): Promise<GameState> => {
    return apiClient.post<GameState>(API_ENDPOINTS.RECORD_THROW(gameId), data);
  },

  undoThrow: async (gameId: number): Promise<GameState> => {
    return apiClient.delete<GameState>(API_ENDPOINTS.UNDO_THROW(gameId));
  },

  finishGame: async (gameId: number): Promise<GameFinishResponse> => {
    return apiClient.get<GameFinishResponse>(API_ENDPOINTS.FINISH_GAME(gameId));
  },
};
