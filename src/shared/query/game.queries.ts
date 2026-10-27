import { queryOptions } from "@tanstack/react-query";
import { getFinishedGame, getGameSettings, getGameThrows, getTabletGame } from "@/shared/api/game";
import { toLobbyPlayers } from "@/lib/game/lobbyPlayers";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { $gameData, getCachedGameSettings } from "@/shared/store";

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

  /** The tablet game, the one in the lobby or started. The admin routes follow it. */
  tablet: () =>
    queryOptions({
      queryKey: ["game", "tablet"] as const,
      queryFn: async ({ signal }) => {
        try {
          return await getTabletGame(signal);
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("tablet-game.fetch.failed", { error });
          }
          throw error;
        }
      },
    }),

  /** Settings of one game. Starts from the game store's copy of them, if any. */
  settings: (gameId: number) =>
    queryOptions({
      queryKey: ["game", gameId, "settings"] as const,
      // The settings cache keeps one game, so a save for another game can replace it while the
      // game data still holds this game.
      initialData: () => {
        const gameData = $gameData.get();
        return gameData?.id === gameId
          ? gameData.settings
          : (getCachedGameSettings(gameId) ?? undefined);
      },
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
