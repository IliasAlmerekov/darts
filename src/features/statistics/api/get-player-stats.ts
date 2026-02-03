import { apiClient } from "@/lib/api";

const PLAYER_STATS_ENDPOINT = "/players/stats";

export async function getPlayerStats(
  limit: number = 10,
  offset: number = 0,
  sort: string = "average:desc",
) {
  return apiClient.get(PLAYER_STATS_ENDPOINT, { query: { limit, offset, sort } });
}
