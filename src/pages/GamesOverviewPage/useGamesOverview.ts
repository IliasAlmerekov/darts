import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { type LoaderFunctionArgs, useNavigation, useSearchParams } from "react-router-dom";
import { queryClient } from "@/shared/query/queryClient";
import { statsQueries } from "@/shared/query/statistics.queries";
import type { FinishedGameProps } from "@/types";

const LIMIT = 9;

const GAMES_OVERVIEW_ERROR_MESSAGE = "Could not load games overview";

interface UseGamesOverviewResult {
  games: FinishedGameProps[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** The `offset` search param, or 0 (the first page) when it is missing, negative or fractional. */
function parseOffset(value: string | null): number {
  const parsed = Number(value ?? "0");
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

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
    .ensureQueryData(statsQueries.games({ limit: LIMIT, offset }))
    .catch(() => undefined);
  return null;
}

/**
 * Reads the games overview page of the current `offset` from the query cache.
 */
export function useGamesOverview(): UseGamesOverviewResult {
  const [searchParams] = useSearchParams();
  const offset = parseOffset(searchParams.get("offset"));
  const navigation = useNavigation();

  const { data, error, isFetching, refetch } = useQuery({
    ...statsQueries.games({ limit: LIMIT, offset }),
    // The loader already tried this key. Retry is the user's call.
    retryOnMount: false,
  });

  const retry = useCallback((): void => {
    void refetch();
  }, [refetch]);

  const hasError = error !== null;

  return {
    games: hasError ? [] : (data?.items ?? []),
    total: hasError ? 0 : (data?.total ?? 0),
    loading: navigation.state === "loading" || isFetching,
    error: hasError ? GAMES_OVERVIEW_ERROR_MESSAGE : null,
    retry,
  };
}
