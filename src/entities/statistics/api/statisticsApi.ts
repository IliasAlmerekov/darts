import { apiClient, API_ENDPOINTS } from "@/shared/api";
import type { PaginatedRequest, PaginatedResponse } from "@/shared/types/api";
import type { PlayerOverviewItem, PlayerStats } from "@/shared/types/player";

export const statisticsApi = {
  getGamesOverview: (params?: PaginatedRequest) =>
    apiClient.get<PaginatedResponse<PlayerOverviewItem>>(API_ENDPOINTS.GAMES_OVERVIEW, {
      query: params,
    }),

  getPlayerStats: (params?: PaginatedRequest) =>
    apiClient.get<PaginatedResponse<PlayerStats>>(API_ENDPOINTS.PLAYER_STATS, { query: params }),
};
