import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useSearchParams } from "react-router-dom";
import { statsQueries } from "@/shared/query/statistics.queries";
import type { FinishedGameProps } from "@/types";
import { GAMES_OVERVIEW_LIMIT } from "./gamesOverviewLoader";
import { parseOffset } from "./lib/parseOffset";

const GAMES_OVERVIEW_ERROR_MESSAGE = "Could not load games overview";

interface UseGamesOverviewResult {
  games: FinishedGameProps[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Reads the games overview page of the current `offset` from the query cache.
 */
export function useGamesOverview(): UseGamesOverviewResult {
  const [searchParams] = useSearchParams();
  const offset = parseOffset(searchParams.get("offset"));
  const navigation = useNavigation();

  const { data, error, isFetching, refetch } = useQuery({
    ...statsQueries.games({ limit: GAMES_OVERVIEW_LIMIT, offset }),
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
