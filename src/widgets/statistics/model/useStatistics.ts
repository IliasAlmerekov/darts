import { useEffect, useState } from "react";
import { statisticsApi } from "@/entities/statistics";
import type { PaginatedRequest, PaginatedResponse } from "@/shared/types/api";
import type { PlayerOverviewItem, PlayerStats } from "@/shared/types/player";

interface UseStatisticsReturn {
  overview: PaginatedResponse<PlayerOverviewItem> | null;
  playerStats: PaginatedResponse<PlayerStats> | null;
  loading: boolean;
  error: string | null;
  refresh: (params?: PaginatedRequest) => Promise<void>;
}

export function useStatistics(initialParams?: PaginatedRequest): UseStatisticsReturn {
  const [overview, setOverview] = useState<PaginatedResponse<PlayerOverviewItem> | null>(null);
  const [playerStats, setPlayerStats] = useState<PaginatedResponse<PlayerStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (params?: PaginatedRequest) => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, playerStatsData] = await Promise.all([
        statisticsApi.getGamesOverview(params),
        statisticsApi.getPlayerStats(params),
      ]);
      setOverview(overviewData);
      setPlayerStats(playerStatsData);
    } catch (err) {
      console.error("Error loading statistics:", err);
      setError("Statistiken konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { overview, playerStats, loading, error, refresh: load };
}
