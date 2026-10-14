// @vitest-environment jsdom
const getPlayerStatsMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getPlayerStats: (...args: unknown[]) => getPlayerStatsMock(...args),
}));

import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/shared/query/queryClient";
import { useStatisticsPrefetch } from "./useStatisticsPrefetch";

const IDLE_FALLBACK_DELAY_MS = 300;

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useStatisticsPrefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryClient.clear();
    getPlayerStatsMock.mockResolvedValue({ items: [], total: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not load statistics while no user is signed in", async () => {
    renderHook(() => useStatisticsPrefetch(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_DELAY_MS * 2);
    });

    expect(getPlayerStatsMock).not.toHaveBeenCalled();
  });

  it("loads the first statistics page once the auth query returns a user", async () => {
    renderHook(() => useStatisticsPrefetch(), { wrapper });

    act(() => {
      queryClient.setQueryData(["auth", "me"], { id: 1, roles: ["ROLE_ADMIN"] });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_DELAY_MS * 2);
    });

    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);
    expect(getPlayerStatsMock).toHaveBeenCalledWith(10, 0, undefined, expect.any(AbortSignal));
  });
});
