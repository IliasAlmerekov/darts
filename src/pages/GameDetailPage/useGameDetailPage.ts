import { useMemo } from "react";
import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { getFinishedGame } from "@/shared/api/game";
import type { FinishedGameStandings } from "@/lib/game/finishedGameStandings";
import type { FinishedPlayerResponse } from "@/types";
import { buildGameDetailStandings } from "./lib/gameDetailStandings";

type GameDetailLoaderData = FinishedPlayerResponse[];

/**
 * React Router 6 loader
 * Registers the route: loader: gameDetailLoader
 */
export async function gameDetailLoader({
  params,
}: LoaderFunctionArgs): Promise<GameDetailLoaderData> {
  const parseId = Number(params.id);

  if (!Number.isFinite(parseId) || parseId <= 0) {
    throw new Response("Invalid game id", { status: 400 });
  }

  return getFinishedGame(parseId);
}

/**
 * Loads finished game details by route id and builds data for podium/leaderboard.
 */
export function useGameDetailPage(): FinishedGameStandings {
  const rawLoaderData = useLoaderData();

  return useMemo(() => buildGameDetailStandings(rawLoaderData), [rawLoaderData]);
}
