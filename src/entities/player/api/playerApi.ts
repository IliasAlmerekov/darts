import { apiClient } from "@/shared/api";
import { API_ENDPOINTS } from "@/shared/api";
import type { PaginatedRequest, PaginatedResponse } from "@/shared/types/api";
import type { PlayerOverviewItem, PlayerProfile, PlayerStats } from "@/shared/types/player";

export const playerApi = {
  getPlayers: async (params?: PaginatedRequest): Promise<PaginatedResponse<PlayerProfile>> => {
    return apiClient.get(API_ENDPOINTS.PLAYER_STATS, { query: params });
  },

  getPlayerStats: async (params?: PaginatedRequest): Promise<PaginatedResponse<PlayerStats>> => {
    return apiClient.get(API_ENDPOINTS.PLAYER_STATS, { query: params });
  },

  getGamesOverview: async (
    params?: PaginatedRequest,
  ): Promise<PaginatedResponse<PlayerOverviewItem>> => {
    return apiClient.get(API_ENDPOINTS.GAMES_OVERVIEW, { query: params });
  },
};
