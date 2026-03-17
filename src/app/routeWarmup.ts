export interface RouteWarmUpTarget {
  id: "start" | "joined";
  load: () => Promise<unknown>;
}

interface WarmUpScheduler {
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
}

// Warm up only the most common post-auth landing routes.
export const selectiveRouteWarmUpTargets: readonly RouteWarmUpTarget[] = [
  {
    id: "start",
    load: () => import("@/pages/StartPage/StartPage"),
  },
  {
    id: "joined",
    load: () => import("@/pages/JoinedGamePage"),
  },
];

export function warmUpSelectiveRoutes(
  targets: readonly RouteWarmUpTarget[] = selectiveRouteWarmUpTargets,
): void {
  targets.forEach((target) => {
    void target.load();
  });
}

function scheduleIdleTask(scheduler: WarmUpScheduler = window, task: () => void): () => void {
  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const idleCallbackId = scheduler.requestIdleCallback(() => {
      task();
    });

    return () => {
      scheduler.cancelIdleCallback?.(idleCallbackId);
    };
  }

  const timeoutId = scheduler.setTimeout(() => {
    task();
  }, 300);

  return () => {
    scheduler.clearTimeout(timeoutId);
  };
}

export function scheduleSelectiveRouteWarmUp(
  scheduler: WarmUpScheduler = window,
  warmUp: () => void = warmUpSelectiveRoutes,
): () => void {
  return scheduleIdleTask(scheduler, warmUp);
}

export async function prefetchStatisticsPageData(): Promise<void> {
  const { prefetchInitialPlayerStats } = await import("@/pages/StatisticsPage/usePlayerStats");
  await prefetchInitialPlayerStats();
}

export function scheduleStatisticsPrefetch(
  scheduler: WarmUpScheduler = window,
  prefetch: () => Promise<void> | void = prefetchStatisticsPageData,
): () => void {
  return scheduleIdleTask(scheduler, () => {
    void prefetch();
  });
}
