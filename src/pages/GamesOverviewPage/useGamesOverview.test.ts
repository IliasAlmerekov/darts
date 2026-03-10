// @vitest-environment jsdom
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGamesOverview } from "./useGamesOverview";

const getGamesOverviewMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getGamesOverview: (...args: unknown[]) => getGamesOverviewMock(...args),
}));

const GAMES = [
  { id: 1, winnerRounds: 12, winnerName: "Alice", playersCount: 4, date: "2024-01-15T00:00:00Z" },
  { id: 2, winnerRounds: 8, winnerName: "Bob", playersCount: 3, date: "2024-01-10T00:00:00Z" },
];

describe("useGamesOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start with loading true and empty games list", () => {
    getGamesOverviewMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    expect(result.current.loading).toBe(true);
    expect(result.current.games).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should expose fetched games and total when API succeeds", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.games).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("should handle paginated response with items array", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 50 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(50);
    expect(result.current.games.at(0)?.winnerName).toBe("Alice");
  });

  it("should expose empty games list when API returns empty items array", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(0);
    expect(result.current.games).toEqual([]);
  });

  it("should set error message and stop loading when API rejects", async () => {
    getGamesOverviewMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Could not load games overview");
    expect(result.current.games).toEqual([]);
  });

  it("should re-fetch data and clear error when retry is called", async () => {
    getGamesOverviewMock.mockRejectedValueOnce(new Error("fail"));
    getGamesOverviewMock.mockResolvedValueOnce({ items: GAMES, total: 2 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.error).toBe("Could not load games overview"));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.games).toHaveLength(2);
  });

  it("should re-fetch when offset changes", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) => useGamesOverview({ limit: 9, offset }),
      { initialProps: { offset: 0 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getGamesOverviewMock).toHaveBeenCalledTimes(1);

    rerender({ offset: 9 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getGamesOverviewMock).toHaveBeenCalledTimes(2);
  });

  it("should pass limit and offset to the API call", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 18 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getGamesOverviewMock).toHaveBeenCalledWith(9, 18, expect.any(AbortSignal));
  });

  it("should not update state after unmount (no AbortController leak)", async () => {
    let resolve!: (value: unknown) => void;
    getGamesOverviewMock.mockReturnValue(new Promise((res) => (resolve = res)));

    const { result, unmount } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    expect(result.current.loading).toBe(true);
    unmount();

    act(() => {
      resolve({ items: GAMES, total: 2 });
    });

    // State remains unchanged (hook unmounted)
    expect(result.current.loading).toBe(true);
  });

  it("should keep error null for an empty normalized response", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });

    const { result } = renderHook(() => useGamesOverview({ limit: 9, offset: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.games).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
