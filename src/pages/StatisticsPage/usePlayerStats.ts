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

type PlayerStatsQuery = UsePlayerStatsParams;

type PlayerStatsCacheEntry = {
  items: PlayerProps[];
  total: number;
};

export const INITIAL_PLAYER_STATS_QUERY: Readonly<PlayerStatsQuery> = {
  limit: 10,
  offset: 0,
  sortParam: "name:asc",
};

const playerStatsCache = new Map<string, PlayerStatsCacheEntry>();
const playerStatsPrefetches = new Map<string, Promise<PlayerStatsCacheEntry>>();

function getPlayerStatsQueryKey({ limit, offset, sortParam }: PlayerStatsQuery): string {
  return `${limit}:${offset}:${sortParam}`;
}

function cachePlayerStats(queryKey: string, entry: PlayerStatsCacheEntry): PlayerStatsCacheEntry {
  playerStatsCache.set(queryKey, entry);
  return entry;
}

function createPlayerStatsRequest(
  { limit, offset, sortParam }: PlayerStatsQuery,
  signal?: AbortSignal,
): Promise<PlayerStatsCacheEntry> {
  return getPlayerStats(limit, offset, sortParam, signal).then(({ items, total }) => {
    return cachePlayerStats(getPlayerStatsQueryKey({ limit, offset, sortParam }), {
      items,
      total,
    });
  });
}

export function clearPlayerStatsCache(): void {
  playerStatsCache.clear();
  playerStatsPrefetches.clear();
}

export function prefetchPlayerStats(query: PlayerStatsQuery): Promise<void> {
  const queryKey = getPlayerStatsQueryKey(query);
  const cachedEntry = playerStatsCache.get(queryKey);

  if (cachedEntry !== undefined) {
    return Promise.resolve();
  }

  const existingPrefetch = playerStatsPrefetches.get(queryKey);
  if (existingPrefetch !== undefined) {
    return existingPrefetch.then(() => undefined);
  }

  const prefetchRequest = createPlayerStatsRequest(query).finally(() => {
    if (playerStatsPrefetches.get(queryKey) === prefetchRequest) {
      playerStatsPrefetches.delete(queryKey);
    }
  });

  playerStatsPrefetches.set(queryKey, prefetchRequest);
  return prefetchRequest.then(() => undefined);
}

export function prefetchInitialPlayerStats(): Promise<void> {
  return prefetchPlayerStats(INITIAL_PLAYER_STATS_QUERY);
}

export function usePlayerStats({
  limit,
  offset,
  sortParam,
}: UsePlayerStatsParams): UsePlayerStatsResult {
  const queryKey = getPlayerStatsQueryKey({ limit, offset, sortParam });
  const initialCachedEntry = playerStatsCache.get(queryKey);
  const [stats, setStats] = useState<PlayerProps[]>(() => initialCachedEntry?.items ?? []);
  const [total, setTotal] = useState(() => initialCachedEntry?.total ?? 0);
  const [loading, setLoading] = useState(() => initialCachedEntry === undefined);
  const [error, setError] = useState<string | null>(null);
  const [retryState, setRetryState] = useState<{ key: string; count: number }>({
    key: "",
    count: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const shouldForceRefresh = retryState.key === queryKey && retryState.count > 0;
    const cachedEntry = shouldForceRefresh ? undefined : playerStatsCache.get(queryKey);

    if (cachedEntry !== undefined) {
      setStats(cachedEntry.items);
      setTotal(cachedEntry.total);
      setError(null);
      setLoading(false);

      return () => undefined;
    }

    setLoading(true);
    setError(null);

    let disposed = false;
    const requestId = ++requestIdRef.current;
    const prefetchedRequest = shouldForceRefresh ? undefined : playerStatsPrefetches.get(queryKey);
    const controller = prefetchedRequest === undefined ? new AbortController() : null;

    if (controller !== null) {
      abortRef.current = controller;
    }

    const request =
      prefetchedRequest ??
      createPlayerStatsRequest({ limit, offset, sortParam }, controller?.signal).finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      });

    request
      .then(({ items, total: nextTotal }) => {
        if (disposed || requestId !== requestIdRef.current) return;

        setStats(items);
        setTotal(nextTotal);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (disposed || controller?.signal.aborted || requestId !== requestIdRef.current) return;

        console.error("Failed to fetch player stats:", err);
        setError("Could not load player statistics");
        setLoading(false);
      });

    return () => {
      disposed = true;
      controller?.abort();
    };
  }, [limit, offset, queryKey, retryState, sortParam]);

  const retry = useCallback(() => {
    const queryKey = getPlayerStatsQueryKey({ limit, offset, sortParam });

    setRetryState((current) => ({
      key: queryKey,
      count: current.key === queryKey ? current.count + 1 : 1,
    }));
  }, [limit, offset, sortParam]);

  return { stats, total, loading, error, retry };
}
