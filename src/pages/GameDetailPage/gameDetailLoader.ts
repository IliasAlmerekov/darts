import type { LoaderFunctionArgs } from "react-router-dom";
import { routeGameIdOrNotFound } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";

/**
 * React Router 6 loader
 * Registers the route: loader: gameDetailLoader
 * Fills the `['finishedGame', id]` query before the page renders. An invalid id throws a 404
 * route error response before any read. A failed fetch rejects,
 * so the route error boundary shows it.
 */
export async function gameDetailLoader({ params }: LoaderFunctionArgs): Promise<null> {
  const gameId = routeGameIdOrNotFound(params.id);
  if (gameId === null) {
    // The route pattern always carries an id, so this only narrows the type.
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await queryClient.ensureQueryData(gameQueries.finished(gameId));
  return null;
}
