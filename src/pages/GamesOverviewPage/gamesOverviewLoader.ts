import type { LoaderFunctionArgs } from "react-router-dom";
import { queryClient } from "@/shared/query/queryClient";
import { statsQueries } from "@/shared/query/statistics.queries";
import { parseOffset } from "./lib/parseOffset";

/** Page size of the games overview; the loader and `useGamesOverview` read the same key. */
export const GAMES_OVERVIEW_LIMIT = 9;

/**
 * React Router 6 loader for the GamesOverview route.
 * Reads `offset` from URL search params and fills that page's query before the page renders.
 * Register as: loader={gamesOverviewLoader}
 */
export async function gamesOverviewLoader({ request }: LoaderFunctionArgs): Promise<null> {
  const offset = parseOffset(new URL(request.url).searchParams.get("offset"));

  // A failed read is logged by the query function and leaves the query in an error state,
  // which the page shows with its Retry action.
  await queryClient
    .ensureQueryData(statsQueries.games({ limit: GAMES_OVERVIEW_LIMIT, offset }))
    .catch(() => undefined);
  return null;
}
