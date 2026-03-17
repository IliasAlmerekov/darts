import { useCallback } from "react";
import {
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router-dom";
import { getGamesOverview } from "@/shared/api/statistics";
import { clientLogger } from "@/shared/services/browser/clientLogger";
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

type GamesOverviewLoaderData = {
  games: FinishedGameProps[];
  total: number;
  error: string | null;
};

function isCompleteFinishedGame(game: FinishedGameProps): boolean {
  if (typeof game.winnerName !== "string" || game.winnerName.trim().length === 0) {
    return false;
  }

  if (typeof game.date !== "string") {
    return false;
  }

  const parsedDate = new Date(game.date);
  return !Number.isNaN(parsedDate.getTime());
}

function isGamesOverviewLoaderData(value: unknown): value is GamesOverviewLoaderData {
  return (
    typeof value === "object" &&
    value !== null &&
    "games" in value &&
    "total" in value &&
    "error" in value
  );
}

/**
 * React Router 6 loader for the GamesOverview route.
 * Reads `offset` from URL search params and fetches the corresponding page.
 * Register as: loader={gamesOverviewLoader}
 */
export async function gamesOverviewLoader({
  request,
}: LoaderFunctionArgs): Promise<GamesOverviewLoaderData> {
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset") ?? "0");

  try {
    const { items, total } = await getGamesOverview(LIMIT, offset, request.signal);

    const invalidGames = items.filter((game) => !isCompleteFinishedGame(game));
    if (invalidGames.length > 0) {
      clientLogger.error("statistics.games-overview.invalid-data", {
        context: {
          limit: LIMIT,
          offset,
          invalidGameIds: invalidGames.map((game) => game.id),
        },
      });
      return { games: [], total: 0, error: GAMES_OVERVIEW_ERROR_MESSAGE };
    }

    return { games: items, total, error: null };
  } catch (err: unknown) {
    clientLogger.error("statistics.games-overview.fetch.failed", {
      context: { limit: LIMIT, offset },
      error: err,
    });
    return { games: [], total: 0, error: GAMES_OVERVIEW_ERROR_MESSAGE };
  }
}

/**
 * Reads the pre-fetched games overview data provided by the React Router loader.
 */
export function useGamesOverview(): UseGamesOverviewResult {
  const rawLoaderData = useLoaderData();

  if (!isGamesOverviewLoaderData(rawLoaderData)) {
    throw new Error("Unexpected loader data format for GamesOverviewPage");
  }

  const navigation = useNavigation();
  const navigate = useNavigate();

  const retry = useCallback((): void => {
    navigate(0);
  }, [navigate]);

  return {
    games: rawLoaderData.games,
    total: rawLoaderData.total,
    loading: navigation.state === "loading",
    error: rawLoaderData.error,
    retry,
  };
}
