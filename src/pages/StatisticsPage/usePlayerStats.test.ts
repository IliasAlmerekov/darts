// @vitest-environment jsdom
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStats } from "./usePlayerStats";

const getPlayerStatsMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getPlayerStats: (...args: unknown[]) => getPlayerStatsMock(...args),
}));

const PLAYERS = [
  { id: 1, playerId: 1, name: "Alice", scoreAverage: 55.5, gamesPlayed: 10 },
  { id: 2, playerId: 2, name: "Bob", scoreAverage: 40.0, gamesPlayed: 5 },
];

describe("usePlayerStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start with loading true and no data", () => {
    getPlayerStatsMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should expose fetched stats and total when API succeeds", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
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

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(42);
    expect(result.current.stats.at(0)?.name).toBe("Alice");
  });

  it("should fall back to array length as total when API returns plain array", async () => {
    getPlayerStatsMock.mockResolvedValue(PLAYERS);

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(2);
    expect(result.current.stats).toHaveLength(2);
  });

  it("should set error message and stop loading when API rejects", async () => {
    getPlayerStatsMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Could not load player statistics");
    expect(result.current.stats).toEqual([]);
  });

  it("should re-fetch data and clear error when retry is called", async () => {
    getPlayerStatsMock.mockRejectedValueOnce(new Error("fail"));
    getPlayerStatsMock.mockResolvedValueOnce({ items: PLAYERS, total: 2 });

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
    );

    await waitFor(() => expect(result.current.error).toBe("Could not load player statistics"));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats).toHaveLength(2);
  });

  it("should re-fetch when offset changes", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: PLAYERS, total: 2 });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        usePlayerStats({ limit: 10, offset, sortParam: "name:asc" }),
      { initialProps: { offset: 0 } },
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
      ({ sortParam }: { sortParam: string }) => usePlayerStats({ limit: 10, offset: 0, sortParam }),
      { initialProps: { sortParam: "name:asc" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(1);

    rerender({ sortParam: "average:desc" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getPlayerStatsMock).toHaveBeenCalledTimes(2);
  });

  it("should pass limit, offset and sortParam to the API call", async () => {
    getPlayerStatsMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() =>
      usePlayerStats({ limit: 5, offset: 15, sortParam: "average:desc" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getPlayerStatsMock).toHaveBeenCalledWith(5, 15, "average:desc", expect.any(AbortSignal));
  });

  it("should not update state after unmount (no AbortController leak)", async () => {
    let resolve!: (value: unknown) => void;
    getPlayerStatsMock.mockReturnValue(new Promise((res) => (resolve = res)));

    const { result, unmount } = renderHook(() =>
      usePlayerStats({ limit: 10, offset: 0, sortParam: "name:asc" }),
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
