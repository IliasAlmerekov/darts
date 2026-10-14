import { queryOptions } from "@tanstack/react-query";
import { getGamesOverview, getPlayerStats } from "@/shared/api/statistics";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import type { FinishedGameProps, GameDataProps } from "@/types";

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

interface GamesOverviewParams {
  limit: number;
  offset: number;
}

// Long enough for a prefetch at sign-in to serve the Statistics page opened soon after.
const PLAYER_STATS_STALE_TIME_MS = 30_000;

// Long enough that the page does not fetch again right after its loader filled the key.
const GAMES_OVERVIEW_STALE_TIME_MS = 30_000;

function isCompleteFinishedGame(game: FinishedGameProps): boolean {
  if (typeof game.winnerName !== "string" || game.winnerName.trim().length === 0) {
    return false;
  }

  if (typeof game.date !== "string") {
    return false;
  }

  const parsedDate = new Date(game.date);
  return !Number.isNaN(parsedDate.getTime());
}

export const statsQueries = {
  players: ({ limit, offset, sortParam }: PlayerStatsParams) =>
    queryOptions({
      queryKey: ["stats", "players", { limit, offset, sortParam }] as const,
      staleTime: PLAYER_STATS_STALE_TIME_MS,
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
  /** One page of finished games. A page with an incomplete game ends in an error state. */
  games: ({ limit, offset }: GamesOverviewParams) =>
    queryOptions({
      queryKey: ["stats", "games", { limit, offset }] as const,
      staleTime: GAMES_OVERVIEW_STALE_TIME_MS,
      queryFn: async ({ signal }) => {
        let page: GameDataProps;
        try {
          page = await getGamesOverview(limit, offset, signal);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("statistics.games-overview.fetch.failed", {
              context: { limit, offset },
              error,
            });
          }
          throw error;
        }

        const invalidGames = page.items.filter((game) => !isCompleteFinishedGame(game));
        if (invalidGames.length > 0) {
          clientLogger.error("statistics.games-overview.invalid-data", {
            context: { limit, offset, invalidGameIds: invalidGames.map((game) => game.id) },
          });
          throw new Error("Games overview has incomplete games");
        }

        return page;
      },
    }),
};
