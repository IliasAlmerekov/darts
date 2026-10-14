import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { scheduleStatisticsPrefetch } from "@/app/routeWarmup";
import { authQueries } from "@/shared/query/auth.queries";

/**
 * Warms the first statistics page once the auth query holds a user. It only watches the
 * auth query (`enabled: false`) and never starts the session check itself.
 */
export function useStatisticsPrefetch(): void {
  const { data: user } = useQuery({ ...authQueries.me(), enabled: false });
  const isSignedIn = user != null;

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    return scheduleStatisticsPrefetch();
  }, [isSignedIn]);
}
