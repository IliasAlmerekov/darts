import { apiClient } from "@/lib/api";

/**
 * Fetches aggregated player statistics with pagination and sorting.
 */
export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get("/players/stats", { query: { limit, offset, sort } });
}

/**
 * Fetches games overview with pagination and sorting.
 */
export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get("/games/overview", { query: { limit, offset, sort } });
}
