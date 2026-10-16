import { queryOptions, type Query } from "@tanstack/react-query";
import { NetworkError, TimeoutError } from "@/shared/api";
import { getCurrentGame, type CurrentGameResponse } from "@/shared/api/player";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { setCurrentGameId } from "@/shared/store";

export const CURRENT_GAME_POLL_INTERVAL_MS = 3000;

/** A lost connection is expected on a phone. The page shows it, so it is not logged. */
function isLostConnection(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof TimeoutError;
}

/** Polling goes on until the game has started or the player has no current game. */
function isWaitingForStart(currentGame: CurrentGameResponse | undefined): boolean {
  return currentGame === undefined || currentGame.status === "lobby";
}

export const playerQueries = {
  /** The player's current game, polled every 3 seconds while it waits in the lobby. */
  currentGame: () =>
    queryOptions({
      queryKey: ["player", "currentGame"] as const,
      // Every visit to the Waiting room starts with a fresh answer, never a cached one.
      gcTime: 0,
      refetchInterval: (query: Query<CurrentGameResponse>) =>
        isWaitingForStart(query.state.data) ? CURRENT_GAME_POLL_INTERVAL_MS : false,
      queryFn: async ({ signal }): Promise<CurrentGameResponse> => {
        try {
          const currentGame = await getCurrentGame(signal);
          // The server decides the current game; other pages read it from the store.
          if (!signal.aborted) {
            setCurrentGameId(currentGame.gameId);
          }
          return currentGame;
        } catch (error: unknown) {
          if (!signal.aborted && !isLostConnection(error)) {
            clientLogger.error("player.current-game.fetch.failed", { error });
          }
          throw error;
        }
      },
    }),
};
