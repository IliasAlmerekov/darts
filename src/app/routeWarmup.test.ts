// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  scheduleStatisticsPrefetch,
  scheduleSelectiveRouteWarmUp,
  selectiveRouteWarmUpTargets,
  warmUpSelectiveRoutes,
  type RouteWarmUpTarget,
} from "./routeWarmup";

const EXPECTED_IDLE_FALLBACK_DELAY_MS = 300;

function createTarget(id: RouteWarmUpTarget["id"]): RouteWarmUpTarget {
  return {
    id,
    load: vi.fn().mockResolvedValue(undefined),
  };
}

describe("routeWarmup", () => {
  it("should define a narrow selective warm-up set when reading the configured route targets", () => {
    expect(selectiveRouteWarmUpTargets.map((target) => target.id)).toEqual(["start", "joined"]);
  });

  it("should warm up only the configured selective routes when warm-up is triggered", () => {
    const startTarget = createTarget("start");
    const joinedTarget = createTarget("joined");

    warmUpSelectiveRoutes([startTarget, joinedTarget]);

    expect(startTarget.load).toHaveBeenCalledTimes(1);
    expect(joinedTarget.load).toHaveBeenCalledTimes(1);
  });

  it("should use requestIdleCallback and cancel it on cleanup when the browser API is available", () => {
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

  it("should fall back to timeout scheduling when requestIdleCallback is unavailable", () => {
    const warmUp = vi.fn();
    const clearTimeout = vi.fn();
    const setTimeout = vi.fn((callback: () => void, delay?: number) => {
      expect(delay).toBe(EXPECTED_IDLE_FALLBACK_DELAY_MS);
      scheduledCallback = callback;
      return 11;
    });
    let scheduledCallback: (() => void) | undefined;

    const cleanup = scheduleSelectiveRouteWarmUp(
      {
        setTimeout,
        clearTimeout,
      },
      warmUp,
    );

    expect(warmUp).not.toHaveBeenCalled();

    scheduledCallback?.();

    expect(warmUp).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    cleanup();

    expect(clearTimeout).toHaveBeenCalledWith(11);
  });

  it("should schedule statistics prefetch when the same idle fallback strategy is used", () => {
    const prefetch = vi.fn();
    const clearTimeout = vi.fn();
    const setTimeout = vi.fn((callback: () => void, delay?: number) => {
      expect(delay).toBe(EXPECTED_IDLE_FALLBACK_DELAY_MS);
      scheduledCallback = callback;
      return 17;
    });
    let scheduledCallback: (() => void) | undefined;

    const cleanup = scheduleStatisticsPrefetch(
      {
        setTimeout,
        clearTimeout,
      },
      prefetch,
    );

    expect(prefetch).not.toHaveBeenCalled();

    scheduledCallback?.();

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    cleanup();

    expect(clearTimeout).toHaveBeenCalledWith(17);
  });
});
