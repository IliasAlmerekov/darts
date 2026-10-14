import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getFinishedGame } from "@/shared/api/game";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { queryClient as appQueryClient } from "./queryClient";

const FINISHED_GAME_KEY = "finishedGame";

export const gameQueries = {
  /** Final standings of a finished game. The game page seeds this key after finishing. */
  finished: (gameId: number) =>
    queryOptions({
      queryKey: [FINISHED_GAME_KEY, gameId] as const,
      // A finished game does not change. Undo and rematch remove the entry.
      staleTime: Infinity,
      queryFn: async ({ signal }) => {
        try {
          return await getFinishedGame(gameId, signal);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("game-summary.fetch.failed", {
              context: { finishedGameId: gameId },
              error,
            });
          }
          throw error;
        }
      },
    }),
};

/**
 * Id of the newest cached finished game, or null when none is cached. Game ids grow with
 * creation order, so the highest id wins no matter which response arrived last.
 * Undo and rematch remove the entry, so a game that went back to play is never returned.
 */
export function getLastFinishedGameId(client: QueryClient = appQueryClient): number | null {
  let latest: number | null = null;

  for (const query of client.getQueryCache().findAll({ queryKey: [FINISHED_GAME_KEY] })) {
    const gameId: unknown = query.queryKey[1];
    if (typeof gameId !== "number" || query.state.data === undefined) {
      continue;
    }
    if (latest === null || gameId > latest) {
      latest = gameId;
    }
  }

  return latest;
}
