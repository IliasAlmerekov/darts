import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { buildGameDetailStandings } from "./lib/gameDetailStandings";

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
