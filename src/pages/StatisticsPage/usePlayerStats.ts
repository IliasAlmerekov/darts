import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerStats } from "@/shared/api/statistics";
import type { PlayerProps } from "@/types";

type UsePlayerStatsParams = {
  limit: number;
  offset: number;
  sortParam: string;
};

type UsePlayerStatsResult = {
  stats: PlayerProps[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function usePlayerStats({
  limit,
  offset,
  sortParam,
}: UsePlayerStatsParams): UsePlayerStatsResult {
  const [stats, setStats] = useState<PlayerProps[]>([]);
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

    getPlayerStats(limit, offset, sortParam, controller.signal)
      .then(({ items, total }) => {
        if (controller.signal.aborted) return;

        setStats(items);
        setTotal(total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch player stats:", err);
        setError("Could not load player statistics");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [limit, offset, sortParam, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { stats, total, loading, error, retry };
}
