// @vitest-environment jsdom
import { FakeEventSource } from "@/test/FakeEventSource";

vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/client")>()),
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { ApiError } from "@/shared/api";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useRoster } from "./useRoster";
import { apiClient } from "@/shared/api/client";
import { respondWith } from "@/shared/api/test-utils";
import { clientLogger } from "@/shared/services/browser/clientLogger";

import type { GameThrowsResponse } from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { queryClient } from "@/shared/query/queryClient";
import { resetGameStore, acceptGame } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";

// ---------------------------------------------------------------------------
// FakeEventSource — replaces the global EventSource so real useEventSource
// creates instances we can control in tests.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let testQueryClient: QueryClient;

function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

function HookConsumer({ gameId }: { gameId: number | null }): React.JSX.Element {
  const { seats } = useRoster(gameId, { onStreamClosed: vi.fn(), onError: vi.fn() });
  return <div data-testid="count">{seats.length}</div>;
}

function renderHookConsumer(gameId: number | null): ReturnType<typeof render> {
  return render(<HookConsumer gameId={gameId} />, { wrapper: Providers });
}

function renderGamePlayers(initialGameId: number | null) {
  return renderHook(
    ({ gameId }: { gameId: number | null }) =>
      useRoster(gameId, { onStreamClosed: vi.fn(), onError: vi.fn() }),
    {
      initialProps: { gameId: initialGameId },
      wrapper: Providers,
    },
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useRoster", () => {
  beforeEach(() => {
    FakeEventSource.last = null;
    vi.resetAllMocks();
    queryClient.clear();
    testQueryClient = queryClient;
    resetGameStore();
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts server order after a completed reorder", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    vi.mocked(apiClient.post).mockImplementationOnce(respondWith({ success: true }));
    const { result } = renderGamePlayers(5);
    await act(async () => {
      result.current.reorder(2, 1);
    });
    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 2, name: "B", position: 1 },
          ],
        }),
      );
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 2]));
  });

  it("preserves the dragged order and updates membership when the loader revalidates", async () => {
    const pending = deferred<void>();
    vi.mocked(apiClient.post).mockImplementationOnce(async (...args) => {
      await pending.promise;
      return respondWith({ success: true })(...args);
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(3, 1));
    act(() =>
      acceptGame(
        buildGameThrowsResponse({
          id: 5,
          status: "lobby",
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 3, name: "C", position: 1 }),
            buildBackendPlayer({ id: 4, name: "D", position: 2 }),
          ],
        }),
      ),
    );
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([3, 1, 4]));
    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("keeps the dragged order while the stream removes and adds seats", async () => {
    const pending = deferred<void>();
    vi.mocked(apiClient.post).mockImplementationOnce(async (...args) => {
      await pending.promise;
      return respondWith({ success: true })(...args);
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(3, 1));
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 3, name: "C", position: 1 },
            { id: 4, name: "D", position: 2 },
          ],
        }),
      ),
    );
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([3, 1, 4]));
    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("returns add outcomes and revalidates locked seats", async () => {
    const revalidate = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed: revalidate, onError: vi.fn() }),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: true, player: { id: 1, name: "A", position: 0 } }),
    );
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({ status: "added" });
    });
    vi.mocked(apiClient.post).mockRejectedValueOnce(error);
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({
        status: "seats-not-editable",
        error,
      });
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
    const failure = new Error("network");
    vi.mocked(apiClient.post).mockRejectedValueOnce(failure);
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({
        status: "failed",
        error: failure,
      });
    });
    const pending = deferred<never>();
    vi.mocked(apiClient.post).mockReturnValueOnce(pending.promise);
    let answer: Promise<unknown>;
    act(() => {
      answer = result.current.add({ username: "A" });
    });
    rerender({ gameId: 6 });
    await act(async () => {
      pending.resolve(Promise.reject(failure) as never);
      expect(await answer).toEqual({ status: "stale", error: failure });
    });
  });

  it("reports a full lobby on add without revalidating", async () => {
    const revalidate = vi.fn();
    const warn = vi.spyOn(clientLogger, "warn").mockImplementation(() => {});
    const error = new ApiError("Conflict", {
      status: 409,
      data: { success: false, error: "GAME_ROOM_FULL", message: "Room is full." },
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    const { result } = renderHook(
      () => useRoster(5, { onStreamClosed: revalidate, onError: vi.fn() }),
      {
        wrapper: Providers,
      },
    );
    vi.mocked(apiClient.post).mockRejectedValueOnce(error);

    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({ status: "lobby-full", error });
    });

    expect(revalidate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("room.guest.lobby-full", { context: { gameId: 5 }, error });
  });

  it("reports a taken username on add with the server message and suggestions", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    const { result } = renderGamePlayers(5);
    const taken = (data: Record<string, unknown>): ApiError =>
      new ApiError("Conflict", {
        status: 409,
        data: { success: false, error: "USERNAME_TAKEN", ...data },
      });

    vi.mocked(apiClient.post).mockRejectedValueOnce(
      taken({ message: "Taken.", suggestions: ["A2", "A3"] }),
    );
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({
        status: "username-taken",
        message: "Taken.",
        suggestions: ["A2", "A3"],
      });
    });

    vi.mocked(apiClient.post).mockRejectedValueOnce(taken({ message: "" }));
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({
        status: "username-taken",
        message: "",
        suggestions: [],
      });
    });

    const malformed = taken({ suggestions: ["A2", 3] });
    vi.mocked(apiClient.post).mockRejectedValueOnce(malformed);
    await act(async () => {
      expect(await result.current.add({ username: "A" })).toEqual({
        status: "failed",
        error: malformed,
      });
    });
  });

  it("logs a stale add answer unless it is a seat conflict or a full lobby", async () => {
    const warn = vi.spyOn(clientLogger, "warn").mockImplementation(() => {});
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    const conflict = (code: string): ApiError =>
      new ApiError("Conflict", { status: 409, data: { success: false, error: code } });
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed: vi.fn(), onError: vi.fn() }),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );

    async function staleAnswer(error: unknown): Promise<unknown> {
      const pending = deferred<never>();
      vi.mocked(apiClient.post).mockReturnValueOnce(pending.promise);
      let answer: Promise<unknown> = Promise.resolve();
      act(() => {
        answer = result.current.add({ username: "A" });
      });
      rerender({ gameId: 6 });
      rerender({ gameId: 5 });
      let settled: unknown;
      await act(async () => {
        pending.resolve(Promise.reject(error) as never);
        settled = await answer;
      });
      return settled;
    }

    const full = conflict("GAME_ROOM_FULL");
    expect(await staleAnswer(full)).toEqual({ status: "stale", error: full });
    expect(warn).toHaveBeenCalledWith("room.guest.lobby-full", {
      context: { gameId: 5 },
      error: full,
    });
    const locked = conflict("GAME_SEATS_NOT_EDITABLE");
    expect(await staleAnswer(locked)).toEqual({ status: "stale", error: locked });
    expect(warn.mock.calls.map(([event]) => event)).toEqual([
      "room.guest.lobby-full",
      "room.guest.seats-not-editable",
    ]);

    const taken = conflict("USERNAME_TAKEN");
    expect(await staleAnswer(taken)).toEqual({ status: "stale", error: taken });
    expect(warn).toHaveBeenLastCalledWith("room.guest.stale-answer", {
      context: { gameId: 5 },
      error: taken,
    });
  });

  it("rolls back a failed removal and revalidates locked seats", async () => {
    const revalidate = vi.fn();
    const onError = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderHook(() => useRoster(5, { onStreamClosed: revalidate, onError }), {
      wrapper: Providers,
    });
    vi.mocked(apiClient.delete).mockRejectedValueOnce(error);
    await act(async () => {
      await result.current.remove(1);
    });
    await waitFor(() => expect(result.current.seats).toEqual([{ id: 1, name: "A", position: 0 }]));
    expect(revalidate).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      "This game has already started. The lobby can no longer be changed.",
    );
  });

  it("restores a seat received immediately before a failed removal", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error("network"));
    const { result } = renderGamePlayers(5);
    await act(async () => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 1, name: "A", position: 0 }] }),
      );
      await result.current.remove(1);
    });
    await waitFor(() => expect(result.current.seats).toEqual([{ id: 1, name: "A", position: 0 }]));
  });

  it("restores a removed seat with no position to its original order", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: null },
      { id: 2, name: "B", position: null },
    ]);
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error("network"));
    const { result } = renderGamePlayers(5);
    await act(async () => {
      await result.current.remove(1);
    });
    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual([
      { id: 1, name: "A", position: null },
      { id: 2, name: "B", position: null },
    ]);
  });

  it("logs unexpected removal failures", async () => {
    const error = new Error("network");
    const log = vi.spyOn(clientLogger, "error").mockImplementation(() => {});
    vi.mocked(apiClient.delete).mockRejectedValueOnce(error);
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderGamePlayers(5);
    await act(async () => {
      await result.current.remove(1);
    });
    expect(log).toHaveBeenCalledWith("room.leave.failed", { context: { gameId: 5 }, error });
    log.mockRestore();
  });

  it("ignores a failed removal after the game changes", async () => {
    const log = vi.spyOn(clientLogger, "warn").mockImplementation(() => {});
    let rejectRemoval!: (error: Error) => void;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectRemoval = reject;
    });
    const revalidate = vi.fn();
    const onError = vi.fn();
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, [
      { id: 2, name: "B", position: 0 },
    ]);
    vi.mocked(apiClient.delete).mockReturnValueOnce(pending);
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed: revalidate, onError }),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    let removal!: Promise<void>;
    act(() => {
      removal = result.current.remove(1);
    });
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/room/5",
      expect.objectContaining({ query: { playerId: 1 } }),
    );
    rerender({ gameId: 6 });
    const error = new Error("network");
    await act(async () => {
      rejectRemoval(error);
      await removal;
    });
    expect(result.current.seats).toEqual([{ id: 2, name: "B", position: 0 }]);
    expect(onError).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("room.leave.stale-answer", { context: { gameId: 5 }, error });
  });

  it("ignores a seat conflict from a removal after the game changes", async () => {
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    let rejectRemoval: (reason: unknown) => void = () => {};
    vi.mocked(apiClient.delete).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRemoval = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, [
      { id: 2, name: "B", position: 0 },
    ]);
    const onStreamClosed = vi.fn();
    const onError = vi.fn();
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed, onError }),
      {
        initialProps: { gameId: 5 },
        wrapper: Providers,
      },
    );
    let removal: Promise<void> = Promise.resolve();
    act(() => {
      removal = result.current.remove(1);
    });
    rerender({ gameId: 6 });
    await act(async () => {
      rejectRemoval(error);
      await removal;
    });
    expect(result.current.seats).toEqual([{ id: 2, name: "B", position: 0 }]);
    expect(onStreamClosed).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps a newer stream roster when a removal fails", async () => {
    let rejectRemoval!: (error: Error) => void;
    vi.mocked(apiClient.delete).mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectRemoval = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderGamePlayers(5);
    let removal!: Promise<void>;
    act(() => {
      removal = result.current.remove(1);
    });
    act(() => {
      FakeEventSource.last?.dispatch("players", JSON.stringify({ players: [] }));
    });
    await act(async () => {
      rejectRemoval(new Error("network"));
      await removal;
    });
    await waitFor(() => expect(result.current.seats).toEqual([]));
  });

  it("reconciles a failed reorder with a newer stream roster", async () => {
    let rejectOrder!: (error: Error) => void;
    vi.mocked(apiClient.post).mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectOrder = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    const { result } = renderGamePlayers(5);
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    act(() => {
      result.current.reorder(Number(drag.active.id), Number(drag.over?.id));
    });
    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 2, name: "B", position: 0 },
            { id: 3, name: "C", position: 1 },
          ],
        }),
      );
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([2, 3]));
    await act(async () => {
      rejectOrder(new Error("network"));
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([2, 3]));
  });

  it("sends one reorder request per drag in Strict Mode", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    vi.mocked(apiClient.post).mockImplementation(respondWith({ success: true }));
    const { result } = renderHook(
      () => useRoster(5, { onStreamClosed: vi.fn(), onError: vi.fn() }),
      {
        wrapper: ({ children }) => (
          <React.StrictMode>
            <Providers>{children}</Providers>
          </React.StrictMode>
        ),
      },
    );
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    vi.mocked(apiClient.post).mockClear();
    await act(async () => {
      result.current.reorder(Number(drag.active.id), Number(drag.over?.id));
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it("sends the reordered positions and rolls back when seats are locked", async () => {
    const revalidate = vi.fn();
    const onError = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.roster(7).queryKey, [
      { id: 10, name: "A", position: 0 },
      { id: 20, name: "B", position: 1 },
      { id: 30, name: "C", position: 2 },
    ]);
    vi.mocked(apiClient.post).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useRoster(7, { onStreamClosed: revalidate, onError }), {
      wrapper: Providers,
    });
    const drag = { active: { id: 20 }, over: { id: 10 } } as unknown as DragEndEvent;
    await act(async () => {
      result.current.reorder(Number(drag.active.id), Number(drag.over?.id));
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/room/7/positions",
      {
        positions: [
          { playerId: 20, position: 0 },
          { playerId: 10, position: 1 },
          { playerId: 30, position: 2 },
        ],
      },
      expect.anything(),
    );
    expect(result.current.seats.map(({ id }) => id)).toEqual([10, 20, 30]);
    expect(revalidate).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("keeps a newer reorder when an earlier request fails and merges an SSE update", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 2, name: "B", position: 0 }),
            buildBackendPlayer({ id: 3, name: "C", position: 1 }),
            buildBackendPlayer({ id: 1, name: "A", position: 2 }),
            buildBackendPlayer({ id: 4, name: "D", position: 3 }),
          ],
        }),
      ),
    );
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(async (...args) => {
        await second.promise;
        return respondWith({ success: true })(...args);
      });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => {
      result.current.reorder(2, 1);
    });
    act(() => {
      result.current.reorder(3, 1);
    });
    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 2, name: "B", position: 1 },
            { id: 3, name: "C", position: 2 },
            { id: 4, name: "D", position: 3 },
          ],
        }),
      );
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([2, 3, 1, 4]));
    await act(async () => {
      first.resolve(Promise.reject(new Error("network")) as never);
      await first.promise.catch(() => {});
    });
    expect(result.current.seats.map(({ id }) => id)).toEqual([2, 3, 1, 4]);
    await act(async () => {
      second.resolve();
      await second.promise;
    });
  });

  it("keeps the dragged order until every overlapping reorder has settled", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 3, name: "C", position: 1 }),
            buildBackendPlayer({ id: 4, name: "D", position: 2 }),
          ],
        }),
      ),
    );
    vi.mocked(apiClient.post)
      .mockImplementationOnce(async (...args) => {
        await first.promise;
        return respondWith({ success: true })(...args);
      })
      .mockImplementationOnce(async (...args) => {
        await second.promise;
        return respondWith({ success: true })(...args);
      });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve();
      await second.promise;
    });
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 3, name: "C", position: 1 },
            { id: 4, name: "D", position: 2 },
          ],
        }),
      ),
    );
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([3, 1, 4]));
    await act(async () => {
      first.resolve();
      await first.promise;
    });
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 3, name: "C", position: 1 },
            { id: 4, name: "D", position: 2 },
          ],
        }),
      ),
    );
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 3, 4]));
  });

  it("reloads the server order after both overlapping reorders fail", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          status: "lobby",
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 2, name: "B", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      ),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 2, 3]));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/game/5",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("reloads the final server order when successful requests finish out of order", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.post)
      .mockImplementationOnce(async (...args) => {
        await first.promise;
        return respondWith({ success: true })(...args);
      })
      .mockImplementationOnce(async (...args) => {
        await second.promise;
        return respondWith({ success: true })(...args);
      });
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 2, name: "B", position: 0 }),
            buildBackendPlayer({ id: 1, name: "A", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      ),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve();
      await second.promise;
    });
    await act(async () => {
      first.resolve();
      await first.promise;
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([2, 1, 3]));
    expect(apiClient.get).toHaveBeenCalledOnce();
  });

  it("keeps stream membership when recovery returns an older player list", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 2, name: "B", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      ),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 3, name: "C", position: 1 },
            { id: 4, name: "D", position: 2 },
          ],
        }),
      ),
    );
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 3, 4]));
  });

  it("keeps a stream update that arrives while the recovery read is pending", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const read = deferred<GameThrowsResponse>();
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(apiClient.get).mockImplementationOnce(async (...args) =>
      respondWith(await read.promise)(...args),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 3, name: "C", position: 0 },
            { id: 1, name: "A", position: 1 },
            { id: 4, name: "D", position: 2 },
          ],
        }),
      ),
    );
    await act(async () => {
      read.resolve(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 2, name: "B", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      );
      await read.promise;
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([3, 1, 4]));
  });

  it("reloads an older successful reorder when the newer reorder fails first", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.post)
      .mockImplementationOnce(async (...args) => {
        await first.promise;
        return respondWith({ success: true })(...args);
      })
      .mockReturnValueOnce(second.promise);
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 2, name: "B", position: 0 }),
            buildBackendPlayer({ id: 1, name: "A", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      ),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve();
      await first.promise;
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([2, 1, 3]));
  });

  it("discards a recovery read after a newer reorder starts", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const read = deferred<GameThrowsResponse>();
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockImplementationOnce(respondWith({ success: true }));
    vi.mocked(apiClient.get).mockImplementationOnce(async (...args) =>
      respondWith(await read.promise)(...args),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    await act(async () => result.current.reorder(3, 2));
    await act(async () => {
      read.resolve(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 2, name: "B", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      );
      await read.promise;
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([3, 2, 1]));
  });

  it("retries recovery when a guest is added during the read", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const read = deferred<GameThrowsResponse>();
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockImplementationOnce(
        respondWith({ success: true, player: { id: 4, name: "D", position: null } }),
      );
    vi.mocked(apiClient.get)
      .mockImplementationOnce(async (...args) => respondWith(await read.promise)(...args))
      .mockImplementationOnce(
        respondWith(
          buildGameThrowsResponse({
            id: 5,
            players: [
              buildBackendPlayer({ id: 1, name: "A", position: 0 }),
              buildBackendPlayer({ id: 2, name: "B", position: 1 }),
              buildBackendPlayer({ id: 3, name: "C", position: 2 }),
              buildBackendPlayer({ id: 4, name: "D", position: null }),
            ],
          }),
        ),
      );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    await act(async () => {
      await result.current.add({ username: "D" });
    });
    await act(async () => {
      read.resolve(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 2, name: "B", position: 1 }),
            buildBackendPlayer({ id: 3, name: "C", position: 2 }),
          ],
        }),
      );
      await read.promise;
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 2, 3, 4]));
  });

  it("reports a failed recovery read", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const readError = new Error("read failed");
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(apiClient.get).mockRejectedValueOnce(readError);
    const log = vi.spyOn(clientLogger, "error").mockImplementation(() => {});
    const onError = vi.fn();
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderHook(() => useRoster(5, { onStreamClosed: vi.fn(), onError }), {
      wrapper: Providers,
    });
    act(() => result.current.reorder(2, 1));
    act(() => result.current.reorder(3, 1));
    await act(async () => {
      second.resolve(Promise.reject(new Error("second")) as never);
      await second.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve(Promise.reject(new Error("first")) as never);
      await first.promise.catch(() => {});
    });
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith("room.player-order.reload.failed", { error: readError }),
    );
    expect(onError).toHaveBeenCalledWith("Could not refresh player order. Please try again.");
  });

  it("rolls back a rejected reorder and leaves the new game untouched by a late rejection", async () => {
    const error = new Error("network");
    const onError = vi.fn();
    const pending = deferred<void>();
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, [
      { id: 3, name: "C", position: 0 },
    ]);
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed: vi.fn(), onError }),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    vi.mocked(apiClient.post).mockRejectedValueOnce(error);
    await act(async () => {
      result.current.reorder(Number(drag.active.id), Number(drag.over?.id));
    });
    expect(result.current.seats.map(({ id }) => id)).toEqual([1, 2]);
    expect(onError).toHaveBeenCalledOnce();
    onError.mockClear();
    vi.mocked(apiClient.post).mockReturnValueOnce(pending.promise);
    act(() => {
      result.current.reorder(Number(drag.active.id), Number(drag.over?.id));
    });
    rerender({ gameId: 6 });
    await act(async () => {
      pending.resolve(Promise.reject(error) as never);
      await pending.promise.catch(() => {});
    });
    expect(result.current.seats.map(({ id }) => id)).toEqual([3]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignores a reorder from before leaving and returning to the same game", async () => {
    let rejectOrder: (error: Error) => void = () => {};
    vi.mocked(apiClient.post).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOrder = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, []);
    const onError = vi.fn();
    const { result, rerender } = renderHook(
      ({ gameId }) => useRoster(gameId, { onStreamClosed: vi.fn(), onError }),
      {
        initialProps: { gameId: 5 },
        wrapper: Providers,
      },
    );
    act(() => result.current.reorder(2, 1));
    rerender({ gameId: 6 });
    rerender({ gameId: 5 });
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 1, name: "A", position: 0 },
            { id: 2, name: "B", position: 1 },
          ],
        }),
      ),
    );
    await act(async () => {
      rejectOrder(new Error("network"));
    });
    await waitFor(() => expect(result.current.seats.map(({ id }) => id)).toEqual([1, 2]));
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not roll back a reorder after the hook unmounts", async () => {
    let rejectOrder: (error: Error) => void = () => {};
    vi.mocked(apiClient.post).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOrder = reject;
      }),
    );
    const original = [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ];
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, original);
    const { result, unmount } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    unmount();
    const newer = [
      { id: 2, name: "B", position: 0 },
      { id: 1, name: "A", position: 1 },
    ];
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, newer);
    await act(async () => {
      rejectOrder(new Error("network"));
    });
    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual(newer);
  });

  it("does not restore a removed seat after the hook unmounts", async () => {
    let rejectRemoval: (error: Error) => void = () => {};
    vi.mocked(apiClient.delete).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRemoval = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    const { result, unmount } = renderGamePlayers(5);
    act(() => {
      void result.current.remove(1);
    });
    unmount();
    const newer = [{ id: 2, name: "B", position: 0 }];
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, newer);
    await act(async () => {
      rejectRemoval(new Error("network"));
    });
    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual(newer);
  });

  it("ignores a removal failure after leaving and returning to the same game", async () => {
    const pending = deferred<void>();
    vi.mocked(apiClient.delete).mockReturnValueOnce(pending.promise);
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, []);
    const { result, rerender } = renderGamePlayers(5);
    let removal: Promise<void> = Promise.resolve();
    act(() => {
      removal = result.current.remove(1);
    });
    rerender({ gameId: 6 });
    rerender({ gameId: 5 });
    const newer = [{ id: 2, name: "B", position: 0 }];
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, newer);
    await act(async () => {
      pending.resolve(Promise.reject(new Error("old")) as never);
      await removal;
    });
    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual(newer);
  });

  it("ignores an add response after leaving and returning to the same game", async () => {
    const pending = deferred<void>();
    vi.mocked(apiClient.post).mockImplementationOnce(async (...args) => {
      await pending.promise;
      return respondWith({ success: true, player: { id: 1, name: "A", position: null } })(...args);
    });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, []);
    const { result, rerender } = renderGamePlayers(5);
    let addition: Promise<unknown> = Promise.resolve();
    act(() => {
      addition = result.current.add({ username: "A" });
    });
    rerender({ gameId: 6 });
    rerender({ gameId: 5 });
    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(await addition).toEqual({ status: "stale", error: null });
    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual([]);
  });

  it("ignores an old failure while new reorders run after returning to the game", async () => {
    const old = deferred<void>();
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [
            buildBackendPlayer({ id: 1, name: "A", position: 0 }),
            buildBackendPlayer({ id: 3, name: "C", position: 1 }),
            buildBackendPlayer({ id: 2, name: "B", position: 2 }),
          ],
        }),
      ),
    );
    vi.mocked(apiClient.post)
      .mockReturnValueOnce(old.promise)
      .mockImplementationOnce(async (...args) => {
        await first.promise;
        return respondWith({ success: true })(...args);
      })
      .mockImplementationOnce(async (...args) => {
        await second.promise;
        return respondWith({ success: true })(...args);
      });
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    testQueryClient.setQueryData(gameQueries.roster(6).queryKey, []);
    const { result, rerender } = renderGamePlayers(5);
    act(() => result.current.reorder(2, 1));
    rerender({ gameId: 6 });
    rerender({ gameId: 5 });
    act(() => result.current.reorder(3, 2));
    act(() => result.current.reorder(1, 3));
    await act(async () => {
      old.resolve(Promise.reject(new Error("old")) as never);
      await old.promise.catch(() => {});
    });
    await act(async () => {
      first.resolve();
      await first.promise;
      second.resolve();
      await second.promise;
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
  });

  it("should clear players when SSE sends an empty list", async () => {
    vi.mocked(apiClient.get).mockImplementation(
      respondWith(
        buildGameThrowsResponse({
          players: [buildBackendPlayer({ id: 1, name: "Player 1", isActive: true, position: 0 })],
        }),
      ),
    );

    renderHookConsumer(1);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    act(() => {
      FakeEventSource.last?.dispatch("players", JSON.stringify({ players: [] }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });
  });

  it("should not fetch players when game id is missing", async () => {
    renderHookConsumer(null);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    // We don't rely on internal API calls for this behavior; the hook should keep the count at 0.
  });

  it("should not update player count when fetch fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("fetch failed"));

    renderHookConsumer(42);

    // Even if the initial fetch fails, the hook should keep the player count at 0.
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });
  });

  it("should continue streaming after malformed SSE payload and process valid payloads", async () => {
    vi.mocked(apiClient.get).mockImplementation(respondWith(buildGameThrowsResponse()));

    renderHookConsumer(7);

    act(() => {
      FakeEventSource.last?.dispatch("players", "{invalid-json");
    });

    // stream must survive the parse error — count stays 0
    expect(screen.getByTestId("count").textContent).toBe("0");

    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [{ id: 1, username: "Player 1", position: 0 }],
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });

  it.each([
    ["an object username", { id: 3, username: { first: "Mallory" }, position: 0 }],
    ["a string position", { id: 3, username: "Mallory", position: "0" }],
  ])(
    "should keep the last valid roster when an SSE players event has %s",
    async (_case, badPlayer) => {
      const log = vi.spyOn(clientLogger, "error").mockImplementation(() => {});
      testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
      const { result } = renderGamePlayers(5);
      const stream = FakeEventSource.last;

      act(() => {
        stream?.dispatch(
          "players",
          JSON.stringify({
            players: [
              { id: 1, username: "Alice", position: 1 },
              { id: 2, username: "Bob", position: 0 },
            ],
          }),
        );
      });
      await waitFor(() =>
        expect(result.current.seats).toEqual([
          { id: 2, name: "Bob", position: 0 },
          { id: 1, name: "Alice", position: 1 },
        ]),
      );

      const malformed = JSON.stringify({
        players: [{ id: 1, username: "Alice", position: 1 }, badPlayer],
      });
      act(() => {
        stream?.dispatch("players", malformed);
      });

      expect(result.current.seats).toEqual([
        { id: 2, name: "Bob", position: 0 },
        { id: 1, name: "Alice", position: 1 },
      ]);
      expect(log).toHaveBeenCalledWith("room.players.sse-invalid-payload", {
        context: { raw: malformed },
      });
      expect(apiClient.get).not.toHaveBeenCalled();
      expect(stream?.close).not.toHaveBeenCalled();
      expect(FakeEventSource.last).toBe(stream);

      act(() => {
        stream?.dispatch(
          "players",
          JSON.stringify({ players: [{ id: 4, username: "Dave", position: 0 }] }),
        );
      });
      await waitFor(() =>
        expect(result.current.seats).toEqual([{ id: 4, name: "Dave", position: 0 }]),
      );
    },
  );

  it("should read the players the start page loader cached without a request of its own", () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "Alice", position: 0 },
    ]);

    const { result } = renderGamePlayers(5);

    expect(result.current.seats).toEqual([{ id: 1, name: "Alice", position: 0 }]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("should start from the game store when it holds the same game", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise<GameThrowsResponse>(() => {}));
    acceptGame(
      buildGameThrowsResponse({
        id: 5,
        status: "lobby",
        players: [
          buildBackendPlayer({ id: 2, name: "Bob", position: 1 }),
          buildBackendPlayer({ id: 1, name: "Alice", position: 0 }),
        ],
      }),
    );

    const { result } = renderGamePlayers(5);

    expect(result.current.seats).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
  });

  it("should write an SSE players event into the lobby players query", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, []);
    const { result } = renderGamePlayers(5);

    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 3, username: "Cara", position: 0 }] }),
      );
    });

    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual([
      { id: 3, name: "Cara", position: 0 },
    ]);
    await waitFor(() => {
      expect(result.current.seats).toEqual([{ id: 3, name: "Cara", position: 0 }]);
    });
  });

  it("should write optimistic appends and removals into the lobby players query", async () => {
    testQueryClient.setQueryData(gameQueries.roster(5).queryKey, [
      { id: 1, name: "Alice", position: null },
    ]);
    const { result } = renderGamePlayers(5);

    vi.mocked(apiClient.post).mockImplementationOnce(
      respondWith({ success: true, player: { id: 2, name: "Bob", position: null } }),
    );
    await act(async () => {
      await result.current.add({ username: "Bob" });
    });

    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual([
      { id: 1, name: "Alice", position: null },
      { id: 2, name: "Bob", position: null },
    ]);
    await waitFor(() => {
      expect(result.current.seats.length).toBe(2);
    });

    vi.mocked(apiClient.delete).mockImplementationOnce(
      respondWith({ success: true, message: "Removed" }),
    );
    await act(async () => {
      await result.current.remove(1);
    });

    expect(testQueryClient.getQueryData(gameQueries.roster(5).queryKey)).toEqual([
      { id: 2, name: "Bob", position: null },
    ]);
  });

  it("should show game B's players when game A's response arrives after B's", async () => {
    const gameA = deferred<GameThrowsResponse>();
    const gameB = deferred<GameThrowsResponse>();
    vi.mocked(apiClient.get).mockImplementation(async (...args) => {
      const game = await (args[0] === "/game/1" ? gameA.promise : gameB.promise);
      return respondWith(game)(...args);
    });
    const { result, rerender } = renderGamePlayers(1);

    rerender({ gameId: 2 });
    await act(async () => {
      gameB.resolve(
        buildGameThrowsResponse({ id: 2, players: [buildBackendPlayer({ id: 20, name: "Beta" })] }),
      );
      await gameB.promise;
    });
    await act(async () => {
      gameA.resolve(
        buildGameThrowsResponse({
          id: 1,
          players: [buildBackendPlayer({ id: 10, name: "Alpha" })],
        }),
      );
      await gameA.promise;
    });

    await waitFor(() => {
      expect(result.current.seats.map((player) => player.name)).toEqual(["Beta"]);
    });
  });

  it("should keep an SSE players event when the first read resolves after it", async () => {
    const firstRead = deferred<GameThrowsResponse>();
    vi.mocked(apiClient.get).mockImplementation(async (...args) =>
      respondWith(await firstRead.promise)(...args),
    );
    const { result } = renderGamePlayers(5);
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/game/5",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    act(() => {
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 3, username: "Cara", position: 0 }] }),
      );
    });
    await act(async () => {
      firstRead.resolve(buildGameThrowsResponse({ id: 5, players: [] }));
      await firstRead.promise;
    });

    await waitFor(() => {
      expect(result.current.seats).toEqual([{ id: 3, name: "Cara", position: 0 }]);
    });
  });
  it("uses the same null position for HTTP and stream seats", async () => {
    vi.mocked(apiClient.get).mockImplementationOnce(
      respondWith(
        buildGameThrowsResponse({
          id: 5,
          players: [buildBackendPlayer({ id: 1, name: "A", position: null })],
        }),
      ),
    );
    const { result } = renderHook(
      () => useRoster(5, { onStreamClosed: vi.fn(), onError: vi.fn() }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    );
    await waitFor(() =>
      expect(result.current.seats).toEqual([{ id: 1, name: "A", position: null }]),
    );
    act(() =>
      FakeEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 1, name: "A", position: null }] }),
      ),
    );
    await waitFor(() =>
      expect(result.current.seats).toEqual([{ id: 1, name: "A", position: null }]),
    );
  });
});
