import { useCallback, useEffect, useRef, useState } from "react";
import { getGamesOverview } from "@/shared/api/statistics";
import type { FinishedGameProps } from "@/types";

type UseGamesOverviewParams = {
  limit: number;
  offset: number;
};

type UseGamesOverviewResult = {
  games: FinishedGameProps[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useGamesOverview({
  limit,
  offset,
}: UseGamesOverviewParams): UseGamesOverviewResult {
  const [games, setGames] = useState<FinishedGameProps[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    getGamesOverview(limit, offset, controller.signal)
      .then(({ items, total }) => {
        if (controller.signal.aborted) return;

        setGames(items);
        setTotal(total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch games overview:", err);
        setError("Could not load games overview");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [limit, offset, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { games, total, loading, error, retry };
}
