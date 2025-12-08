import { apiClient } from "@/shared/api";
import { API_ENDPOINTS } from "@/shared/api";
import type { CreateRoomResponse } from "@/shared/types/api";

export const roomApi = {
  createRoom: async (data?: { previousGameId?: number }): Promise<CreateRoomResponse> => {
    const room = await apiClient.post<{ gameId: number }>(API_ENDPOINTS.CREATE_ROOM, data);
    const invite = await apiClient.get<CreateRoomResponse>(
      API_ENDPOINTS.CREATE_INVITE(room.gameId),
    );
    return invite;
  },

  leaveRoom: async (gameId: number, playerId: number): Promise<void> => {
    return apiClient.delete<void>(API_ENDPOINTS.LEAVE_ROOM(gameId), {
      query: { playerId },
    });
  },

  createRematch: async (gameId: number): Promise<CreateRoomResponse> => {
    const rematch = await apiClient.post<{ gameId: number }>(API_ENDPOINTS.REMATCH(gameId));
    const invite = await apiClient.get<CreateRoomResponse>(
      API_ENDPOINTS.CREATE_INVITE(rematch.gameId),
    );
    return invite;
  },
};
