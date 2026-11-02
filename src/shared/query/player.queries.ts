import { queryOptions, skipToken, type Query } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError, UnauthorizedError } from "@/shared/api";
import { getCurrentGame, getPlayerGameSeat, getPlayerProfile } from "@/shared/api/player";
import type { CurrentGame } from "@/lib/player/currentGame";
import { toGameSeat, type GameSeat } from "@/lib/player/gameSeat";
import { toPlayerProfile, type PlayerProfile } from "@/lib/player/profile";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { setServerCurrentGameId } from "@/shared/store";

export const CURRENT_GAME_POLL_INTERVAL_MS = 3000;

/**
 * A lost connection is expected on a phone and the page shows it. An expired session goes
 * to the API client's 401 handling. Neither is logged.
 */
function isExpectedFailure(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof UnauthorizedError
  );
}

/** Polling goes on until the game has started or the player has no current game. */
function isWaitingForStart(currentGame: CurrentGame | undefined): boolean {
  return currentGame === undefined || currentGame.kind === "lobby";
}

export const playerQueries = {
  /** The player's current game, polled every 3 seconds while it waits in the lobby. */
  currentGame: () =>
    queryOptions({
      queryKey: ["player", "currentGame"] as const,
      // Every visit to the Waiting room starts with a fresh answer, never a cached one.
      gcTime: 0,
      // Offline the default mode would pause the request instead of failing it, so the page
      // would never count failures and never show the lost connection.
      networkMode: "always",
      refetchInterval: (query: Query<CurrentGame>) =>
        isWaitingForStart(query.state.data) ? CURRENT_GAME_POLL_INTERVAL_MS : false,
      queryFn: async ({ signal }): Promise<CurrentGame> => {
        try {
          const currentGame = await getCurrentGame(signal);
          // The server decides the current game; other pages read it from the store.
          if (!signal.aborted) {
            setServerCurrentGameId(currentGame.kind === "none" ? null : currentGame.gameId);
          }
          return currentGame;
        } catch (error: unknown) {
          if (!signal.aborted && !isExpectedFailure(error)) {
            clientLogger.error("player.current-game.fetch.failed", { error });
          }
          throw error;
        }
      },
    }),
  /** The player's seat in a game they belonged to; no game skips the lookup. */
  gameSeat: (gameId: number | null) =>
    queryOptions({
      queryKey: ["player", "gameSeat", gameId] as const,
      // A cached seat from an earlier visit could hide a removal made since.
      gcTime: 0,
      queryFn:
        gameId === null
          ? skipToken
          : async ({ signal }): Promise<GameSeat> => {
              try {
                return toGameSeat(await getPlayerGameSeat(gameId, signal));
              } catch (error: unknown) {
                // A game the server no longer knows is an answer, not a failure.
                const isGameNotFound = error instanceof ApiError && error.status === 404;
                if (!signal.aborted && !isGameNotFound) {
                  clientLogger.error("player.game-seat.fetch.failed", { error });
                }
                throw error;
              }
            },
    }),
  /** The player's own statistics and recent finished games. */
  profile: () =>
    queryOptions({
      queryKey: ["player", "profile"] as const,
      queryFn: async ({ signal }): Promise<PlayerProfile> => {
        try {
          return toPlayerProfile(await getPlayerProfile(signal));
        } catch (error: unknown) {
          if (!signal.aborted) {
            clientLogger.error("player.profile.fetch.failed", { error });
          }
          throw error;
        }
      },
    }),
};
