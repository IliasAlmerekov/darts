import { queryOptions, skipToken, type Query } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError, UnauthorizedError } from "@/shared/api";
import {
  getCurrentGame,
  getPlayerGameSeat,
  getPlayerProfile,
  getPlayerPublicProfile,
} from "@/shared/api/player";
import type { CurrentGame } from "@/lib/player/currentGame";
import { toSeatOutcome, type SeatOutcome } from "@/lib/player/gameSeat";
import {
  toPlayerProfile,
  toPublicProfile,
  type PlayerProfile,
  type PublicProfile,
} from "@/lib/player/profile";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { setServerCurrentGameId } from "@/shared/store";

export const CURRENT_GAME_POLL_INTERVAL_MS = 3000;

// Long enough that the page does not fetch again right after its loader filled the key.
const PUBLIC_PROFILE_STALE_TIME_MS = 30_000;

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
          : async ({ signal }): Promise<SeatOutcome> => {
              try {
                return toSeatOutcome(await getPlayerGameSeat(gameId, signal));
              } catch (error: unknown) {
                // A game the server no longer knows is an answer, not a failure.
                const isGameNotFound = error instanceof ApiError && error.status === 404;
                if (!signal.aborted && !isGameNotFound && !isExpectedFailure(error)) {
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
  /** Another registered player's Public profile: name and statistics; no id skips the read. */
  publicProfile: (playerId: number | null) =>
    queryOptions({
      queryKey: ["player", "publicProfile", playerId] as const,
      staleTime: PUBLIC_PROFILE_STALE_TIME_MS,
      // Offline the default mode would pause the request, so the route loader would never
      // settle and the navigation would hang instead of showing the error with Retry.
      networkMode: "always",
      queryFn:
        playerId === null
          ? skipToken
          : async ({ signal }): Promise<PublicProfile> => {
              try {
                return toPublicProfile(await getPlayerPublicProfile(playerId, signal));
              } catch (error: unknown) {
                // An unknown id, a guest or the admin account is an answer, not a failure.
                const isPlayerNotFound = error instanceof ApiError && error.status === 404;
                if (!signal.aborted && !isPlayerNotFound) {
                  clientLogger.error("player.public-profile.fetch.failed", {
                    context: { playerId },
                    error,
                  });
                }
                throw error;
              }
            },
    }),
};
