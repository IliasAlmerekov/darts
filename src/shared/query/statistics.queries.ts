import { queryOptions } from "@tanstack/react-query";
import { getPlayerStats } from "@/shared/api/statistics";
import { clientLogger } from "@/shared/services/browser/clientLogger";

export interface PlayerStatsParams {
  limit: number;
  offset: number;
  sortParam: string | undefined;
}

export const INITIAL_PLAYER_STATS_PARAMS: Readonly<PlayerStatsParams> = {
  limit: 10,
  offset: 0,
  sortParam: undefined,
};

export const statsQueries = {
  players: ({ limit, offset, sortParam }: PlayerStatsParams) =>
    queryOptions({
      queryKey: ["stats", "players", { limit, offset, sortParam }] as const,
      queryFn: async ({ signal }) => {
        try {
          return await getPlayerStats(limit, offset, sortParam, signal);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("statistics.player-stats.fetch.failed", {
              context: { limit, offset, sortParam },
              error,
            });
          }
          throw error;
        }
      },
    }),
};
