import { queryOptions, type Query } from "@tanstack/react-query";
import { getCurrentGame, type CurrentGameResponse } from "@/shared/api/player";
import { setCurrentGameId } from "@/shared/store";

export const CURRENT_GAME_POLL_INTERVAL_MS = 3000;

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
        const currentGame = await getCurrentGame(signal);
        if (!signal.aborted && currentGame.gameId === null) {
          setCurrentGameId(null);
        }
        return currentGame;
      },
    }),
};
