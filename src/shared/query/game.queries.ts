import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getFinishedGame, getGameSettings, getGameThrows } from "@/shared/api/game";
import { toLobbyPlayers } from "@/lib/game/lobbyPlayers";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { $gameData, getCachedGameSettings } from "@/shared/store";
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

  /** Settings of one game. Starts from the settings copy kept in the game store, if any. */
  settings: (gameId: number) =>
    queryOptions({
      queryKey: ["game", gameId, "settings"] as const,
      initialData: () => getCachedGameSettings(gameId) ?? undefined,
      queryFn: async ({ signal }) => {
        try {
          return await getGameSettings(gameId, signal);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("settings.load.failed", {
              context: { routeGameId: gameId },
              error,
            });
          }
          throw error;
        }
      },
    }),

  /**
   * Players of a game in its lobby. The start page loader, the room's SSE stream and the
   * optimistic player changes write this key.
   */
  lobbyPlayers: (gameId: number) =>
    queryOptions({
      queryKey: ["game", gameId, "players"] as const,
      // The game store copy (updated at 0) is stale, so the page fetches once over it. Data
      // from a fetch, the loader or the SSE stream stays fresh: those writers keep it current.
      staleTime: (query) => (query.state.dataUpdatedAt === 0 ? 0 : Infinity),
      initialData: () => {
        const gameData = $gameData.get();
        return gameData?.id === gameId ? toLobbyPlayers(gameData.players) : undefined;
      },
      initialDataUpdatedAt: 0,
      queryFn: async ({ signal }) => {
        try {
          const gameState = await getGameThrows(gameId, signal);
          return toLobbyPlayers(gameState.players);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("room.players.fetch.failed", {
              context: { gameId },
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
