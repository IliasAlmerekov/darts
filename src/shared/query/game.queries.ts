import { queryOptions } from "@tanstack/react-query";
import {
  getFinishedGame,
  getGameSettings,
  getGameThrows,
  getTabletGame,
  type GameSettings,
} from "@/shared/api/game";
import { toLobbyPlayers } from "@/lib/game/lobbyPlayers";
import { clientLogger } from "@/shared/services/browser/clientLogger";

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

  /** Settings of one game, kept current by the game store and settings page. */
  settings: (gameId: number) =>
    queryOptions({
      queryKey: ["game", gameId, "settings"] as const,
      staleTime: Infinity,
      queryFn: async ({ signal }) => {
        try {
          const settings: GameSettings = await getGameSettings(gameId, signal);
          return settings;
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
      staleTime: Infinity,
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
