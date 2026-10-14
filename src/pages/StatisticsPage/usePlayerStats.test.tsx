// @vitest-environment jsdom
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "@/shared/query/queryClient";
import { INITIAL_PLAYER_STATS_PARAMS, statsQueries } from "@/shared/query/statistics.queries";
import type { PlayerProps } from "@/types";
import { usePlayerStats } from "./usePlayerStats";

const getPlayerStatsMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getPlayerStats: (...args: unknown[]) => getPlayerStatsMock(...args),
}));

const PLAYERS = [
  { id: 1, playerId: 1, name: "Alice", scoreAverage: 55.5, gamesPlayed: 10 },
  { id: 2, playerId: 2, name: "Bob", scoreAverage: 40.0, gamesPlayed: 5 },
];

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("usePlayerStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should start with loading true and no data", () => {
    getPlayerStatsMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("reuses a prefetched first page instead of requesting it again", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });
    await queryClient.prefetchQuery(statsQueries.players(INITIAL_PLAYER_STATS_PARAMS));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => usePlayerStats(INITIAL_PLAYER_STATS_PARAMS), { wrapper });

    expect(result.current.stats).toEqual(PLAYERS);
    expect(result.current.loading).toBe(false);
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);
  });

  it("should expose fetched stats and total when API succeeds", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("should handle paginated response with items array", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 42 });

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(42);
    expect(result.current.stats.at(0)?.name).toBe("Alice");
  });

  it("should expose empty stats when API returns empty items array", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(0);
    expect(result.current.stats).toEqual([]);
  });

  it("should set error message and stop loading when API rejects", async () => {
    getPlayerStatsMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Could not load player statistics");
    expect(result.current.stats).toEqual([]);
  });

  it("should re-fetch data and clear error when retry is called", async () => {
    getPlayerStatsMock.mockRejectedValueOnce(new Error("fail"));
    getPlayerStatsMock.mockResolvedValueOnce({ items: PLAYERS, total: 2 });

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.error).toBe("Could not load player statistics"));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats).toHaveLength(2);
  });

  it("keeps previous data visible while retry is reloading the same query", async () => {
    let resolveRetry: ((value: { items: PlayerProps[]; total: number }) => void) | undefined;

    getPlayerStatsMock.mockResolvedValueOnce({ items: PLAYERS, total: 20 });
    getPlayerStatsMock.mockImplementationOnce(
      () =>
        new Promise<{ items: PlayerProps[]; total: number }>((resolve) => {
          resolveRetry = resolve;
        }),
    );

    const { result } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.stats).toEqual(PLAYERS);
    expect(result.current.total).toBe(20);
    expect(result.current.error).toBeNull();

    act(() => {
      resolveRetry?.({
        items: [{ id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 }],
        total: 20,
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual([
      { id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 },
    ]);
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2);
  });

  it("should re-fetch when offset changes", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        usePlayerStats({ limit: 10, offset, sortParam: undefined }),
      { initialProps: { offset: 0 }, wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);

    rerender({ offset: 10 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2);
  });

  it("should re-fetch when sortParam changes", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });

    const { result, rerender } = renderHook(
      ({ sortParam }: { sortParam: string | undefined }) =>
        usePlayerStats({ limit: 10, offset: 0, sortParam }),
      { initialProps: { sortParam: undefined as string | undefined }, wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);

    rerender({ sortParam: "average:desc" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2);
  });

  it("keeps previous data while the next page is loading", async () => {
    let resolveNextPage: ((value: { items: PlayerProps[]; total: number }) => void) | undefined;

    getPlayerStatsMock.mockResolvedValueOnce({ items: PLAYERS, total: 20 });
    getPlayerStatsMock.mockImplementationOnce(
      () =>
        new Promise<{ items: PlayerProps[]; total: number }>((resolve) => {
          resolveNextPage = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        usePlayerStats({ limit: 10, offset, sortParam: undefined }),
      { initialProps: { offset: 0 }, wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ offset: 10 });

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toEqual(PLAYERS);
    expect(result.current.total).toBe(20);

    act(() => {
      resolveNextPage?.({
        items: [{ id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 }],
        total: 20,
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual([
      { id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 },
    ]);
  });

  it("serves a recently loaded page from cache when returning to it", async () => {
    getPlayerStatsMock.mockResolvedValueOnce({ items: PLAYERS, total: 20 }).mockResolvedValueOnce({
      items: [{ id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 }],
      total: 20,
    });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        usePlayerStats({ limit: 10, offset, sortParam: undefined }),
      { initialProps: { offset: 0 }, wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ offset: 10 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats.at(0)?.name).toBe("Carol");

    rerender({ offset: 0 });

    await waitFor(() => expect(result.current.stats).toEqual(PLAYERS));
    expect(result.current.loading).toBe(false);
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a late response for a previous page", async () => {
    let resolveFirstPage: ((value: { items: PlayerProps[]; total: number }) => void) | undefined;
    const carol = { id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 };

    getPlayerStatsMock
      .mockImplementationOnce(
        () =>
          new Promise<{ items: PlayerProps[]; total: number }>((resolve) => {
            resolveFirstPage = resolve;
          }),
      )
      .mockResolvedValueOnce({ items: [carol], total: 20 });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        usePlayerStats({ limit: 10, offset, sortParam: undefined }),
      { initialProps: { offset: 0 }, wrapper },
    );

    rerender({ offset: 10 });
    await waitFor(() => expect(result.current.stats).toEqual([carol]));

    await act(async () => {
      resolveFirstPage?.({ items: PLAYERS, total: 20 });
      await Promise.resolve();
    });

    expect(result.current.stats).toEqual([carol]);
  });

  it("ignores a late response for a previous sort", async () => {
    let resolveFirstSort: ((value: { items: PlayerProps[]; total: number }) => void) | undefined;
    const carol = { id: 3, playerId: 3, name: "Carol", scoreAverage: 62.1, gamesPlayed: 8 };

    getPlayerStatsMock
      .mockImplementationOnce(
        () =>
          new Promise<{ items: PlayerProps[]; total: number }>((resolve) => {
            resolveFirstSort = resolve;
          }),
      )
      .mockResolvedValueOnce({ items: [carol], total: 1 });

    const { result, rerender } = renderHook(
      ({ sortParam }: { sortParam: string | undefined }) =>
        usePlayerStats({ limit: 10, offset: 0, sortParam }),
      { initialProps: { sortParam: undefined as string | undefined }, wrapper },
    );

    rerender({ sortParam: "average:desc" });
    await waitFor(() => expect(result.current.stats).toEqual([carol]));

    await act(async () => {
      resolveFirstSort?.({ items: PLAYERS, total: 2 });
      await Promise.resolve();
    });

    expect(result.current.stats).toEqual([carol]);
  });

  it("should pass limit, offset and sortParam to the API call", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(
      () => usePlayerStats({ limit: 5, offset: 15, sortParam: "average:desc" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getPlayerStatsMock).toHaveBeenCalledWith(5, 15, "average:desc", expect.any(AbortSignal));
  });

  it("should not update state after unmount (no AbortController leak)", async () => {
    let resolve: (value: unknown) => void = () => {
      throw new Error("Attempted to resolve promise before it was initialized");
    };
    getPlayerStatsMock.mockReturnValue(new Promise((res) => (resolve = res)));

    const { result, unmount } = renderHook(
      () => usePlayerStats({ limit: 10, offset: 0, sortParam: undefined }),
      { wrapper },
    );

    expect(result.current.loading).toBe(true);
    unmount();

    // Resolve after unmount — should not cause React state update warning
    act(() => {
      resolve({ items: PLAYERS, total: 2 });
    });

    // State remains unchanged (hook unmounted)
    expect(result.current.loading).toBe(true);
  });
});
