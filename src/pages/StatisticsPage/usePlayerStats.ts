import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { statsQueries, type PlayerStatsParams } from "@/shared/query/statistics.queries";
import type { PlayerProps } from "@/types";

interface UsePlayerStatsResult {
  stats: PlayerProps[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const NO_STATS: PlayerProps[] = [];

export function usePlayerStats(params: PlayerStatsParams): UsePlayerStatsResult {
  const { data, isFetching, isError, refetch } = useQuery({
    ...statsQueries.players(params),
    placeholderData: keepPreviousData,
  });

  return {
    stats: data?.items ?? NO_STATS,
    total: data?.total ?? 0,
    loading: isFetching,
    error: isError && !isFetching ? "Could not load player statistics" : null,
    retry: () => {
      void refetch();
    },
  };
}
