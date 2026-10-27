import { replace, type LoaderFunctionArgs } from "react-router-dom";
import { ROUTES } from "@/lib/router/routes";
import { routeGameIdOrNotFound } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { fetchTabletGame } from "@/shared/query/tabletGameLoader";

/**
 * React Router 6 loader
 * Registers the route: loader: gameSummaryLoader
 * Only the last finished game has a summary: another game id moves to its details, replacing
 * the history entry. Returns null without fetching when the tablet game read fails.
 * An invalid game id throws a 404 route error response before any read.
 * Fills the `['finishedGame', id]` query before the page renders.
 */
export async function gameSummaryLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response | null> {
  const gameId = routeGameIdOrNotFound(params.id);
  const tabletGame = await fetchTabletGame(request);
  if (tabletGame === null || gameId === null) {
    return null;
  }

  if (gameId !== tabletGame.lastFinishedGameId) {
    return replace(ROUTES.details(gameId));
  }

  // A failed fetch is logged by the query function. The page then mounts, fetches again and
  // shows its Retry action, so the failure does not reach the route error boundary.
  await queryClient.ensureQueryData(gameQueries.finished(gameId)).catch(() => undefined);
  return null;
}
