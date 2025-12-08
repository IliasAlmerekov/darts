import { apiClient } from "@/shared/api";
import { API_ENDPOINTS } from "@/shared/api";
import type { CreateRoomResponse } from "@/shared/types/api";

export const roomApi = {
  createRoom: async (data?: { previousGameId?: number }): Promise<CreateRoomResponse> => {
    return apiClient.post<CreateRoomResponse>(API_ENDPOINTS.CREATE_ROOM, data);
  },

  leaveRoom: async (gameId: number, playerId: number): Promise<void> => {
    return apiClient.delete<void>(API_ENDPOINTS.LEAVE_ROOM(gameId), {
      query: { playerId },
    });
  },

  createRematch: async (gameId: number): Promise<CreateRoomResponse> => {
    return apiClient.post<CreateRoomResponse>(API_ENDPOINTS.REMATCH(gameId));
  },
};
