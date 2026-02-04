import { apiClient } from "@/lib/api";

const GAMES_OVERVIEW_ENDPOINT = "/games/overview";

/**
 * Fetches games overview with pagination and sorting.
 */
export async function getGamesOverview(
  limit: number = 9,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get(GAMES_OVERVIEW_ENDPOINT, { query: { limit, offset, sort } });
}
