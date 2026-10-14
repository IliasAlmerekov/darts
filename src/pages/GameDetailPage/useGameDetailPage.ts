import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, type LoaderFunctionArgs } from "react-router-dom";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { buildGameDetailStandings } from "./lib/gameDetailStandings";

function parseGameId(param: string | undefined): number | null {
  const parsed = Number(param);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * React Router 6 loader
 * Registers the route: loader: gameDetailLoader
 * Fills the `['finishedGame', id]` query before the page renders. A failed fetch rejects,
 * so the route error boundary shows it.
 */
export async function gameDetailLoader({ params }: LoaderFunctionArgs): Promise<null> {
  const gameId = parseGameId(params.id);

  if (gameId === null) {
    throw new Response("Invalid game id", { status: 400 });
  }

  await queryClient.ensureQueryData(gameQueries.finished(gameId));
  return null;
}

/**
 * Reads the finished game of the route id and builds data for podium/leaderboard.
 */
export function useGameDetailPage(): FinishedGameStandings {
  const { id } = useParams<{ id?: string }>();
  const gameId = parseGameId(id);
  const { data } = useQuery({
    ...gameQueries.finished(gameId ?? 0),
    enabled: gameId !== null,
  });

  return useMemo(() => buildGameDetailStandings(data), [data]);
}
