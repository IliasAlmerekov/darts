import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { scheduleStatisticsPrefetch } from "@/app/routeWarmup";
import { authQueries } from "@/shared/query/auth.queries";

/**
 * Warms the first statistics page once the query cache holds an authenticated user. It
 * reads the cache through a subscription, not a query observer: `queryClient.clear()` on
 * logout or 401 orphans an observer, and the next session would never reach it. The hook
 * never starts the session check itself.
 */
export function useStatisticsPrefetch(): void {
  const queryClient = useQueryClient();
  const isSignedIn = useSyncExternalStore(
    (onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
    () => queryClient.getQueryData(authQueries.me().queryKey) != null,
  );

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    return scheduleStatisticsPrefetch();
  }, [isSignedIn]);
}
