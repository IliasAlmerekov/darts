export type RouteWarmUpTarget = {
  id: "start" | "joined";
  load: () => Promise<unknown>;
};

type WarmUpScheduler = {
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

// Warm up only the most common post-auth landing routes.
export const selectiveRouteWarmUpTargets: readonly RouteWarmUpTarget[] = [
  {
    id: "start",
    load: () => import("@/pages/StartPage"),
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

export function scheduleSelectiveRouteWarmUp(
  scheduler: WarmUpScheduler = window,
  warmUp: () => void = warmUpSelectiveRoutes,
): () => void {
  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const idleCallbackId = scheduler.requestIdleCallback(() => {
      warmUp();
    });

    return () => {
      scheduler.cancelIdleCallback?.(idleCallbackId);
    };
  }

  const timeoutId = scheduler.setTimeout(() => {
    warmUp();
  }, 300);

  return () => {
    scheduler.clearTimeout(timeoutId);
  };
}
