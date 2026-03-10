import { describe, expect, it, vi } from "vitest";
import {
  scheduleSelectiveRouteWarmUp,
  selectiveRouteWarmUpTargets,
  warmUpSelectiveRoutes,
  type RouteWarmUpTarget,
} from "./routeWarmup";

function createTarget(id: RouteWarmUpTarget["id"]): RouteWarmUpTarget {
  return {
    id,
    load: vi.fn().mockResolvedValue(undefined),
  };
}

describe("routeWarmup", () => {
  it("defines a narrow selective warm-up set", () => {
    expect(selectiveRouteWarmUpTargets.map((target) => target.id)).toEqual(["start", "joined"]);
  });

  it("warms up only the configured selective routes", () => {
    const startTarget = createTarget("start");
    const joinedTarget = createTarget("joined");

    warmUpSelectiveRoutes([startTarget, joinedTarget]);

    expect(startTarget.load).toHaveBeenCalledTimes(1);
    expect(joinedTarget.load).toHaveBeenCalledTimes(1);
  });

  it("uses requestIdleCallback when available and cancels it on cleanup", () => {
    const warmUp = vi.fn();
    const setTimeout = vi.fn();
    const clearTimeout = vi.fn();
    const cancelIdleCallback = vi.fn();
    let idleCallback: IdleRequestCallback | undefined;

    const cleanup = scheduleSelectiveRouteWarmUp(
      {
        requestIdleCallback: vi.fn((callback: IdleRequestCallback) => {
          idleCallback = callback;
          return 7;
        }),
        cancelIdleCallback,
        setTimeout,
        clearTimeout,
      },
      warmUp,
    );

    expect(setTimeout).not.toHaveBeenCalled();

    idleCallback?.({
      didTimeout: false,
      timeRemaining: () => 50,
    } as IdleDeadline);

    expect(warmUp).toHaveBeenCalledTimes(1);

    cleanup();

    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
    expect(clearTimeout).not.toHaveBeenCalled();
  });

  it("falls back to timeout scheduling when requestIdleCallback is unavailable", () => {
    const warmUp = vi.fn();
    const clearTimeout = vi.fn();
    let scheduledCallback: (() => void) | undefined;

    const cleanup = scheduleSelectiveRouteWarmUp(
      {
        setTimeout: vi.fn((callback: () => void) => {
          scheduledCallback = callback;
          return 11;
        }),
        clearTimeout,
      },
      warmUp,
    );

    expect(warmUp).not.toHaveBeenCalled();

    scheduledCallback?.();

    expect(warmUp).toHaveBeenCalledTimes(1);

    cleanup();

    expect(clearTimeout).toHaveBeenCalledWith(11);
  });
});
