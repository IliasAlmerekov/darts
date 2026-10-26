import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, type LoaderFunctionArgs } from "react-router-dom";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import { parseRouteGameId, routeGameIdOrNotFound } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { buildGameDetailStandings } from "./lib/gameDetailStandings";

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

/**
 * Reads the finished game of the route id and builds data for podium/leaderboard.
 */
export function useGameDetailPage(): FinishedGameStandings {
  const { id } = useParams<{ id?: string }>();
  const gameId = parseRouteGameId(id);
  const { data } = useQuery({
    ...gameQueries.finished(gameId ?? 0),
    enabled: gameId !== null,
  });

  return useMemo(() => buildGameDetailStandings(data), [data]);
}
