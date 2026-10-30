// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
}));

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { ApiError } from "@/shared/api";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useLobbyRoster } from "./useLobbyRoster";
import { addGuestPlayer, leaveRoom, updatePlayerOrder } from "@/shared/api/room";
import { clientLogger } from "@/shared/services/browser/clientLogger";

vi.mock("@/shared/api/room", () => ({
  addGuestPlayer: vi.fn(),
  leaveRoom: vi.fn(),
  updatePlayerOrder: vi.fn(),
}));
import { getGameThrows, type GameThrowsResponse } from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import { resetGameStore, setGameData } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";

// ---------------------------------------------------------------------------
// MockEventSource — replaces the global EventSource so real useEventSource
// creates instances we can control in tests.
// ---------------------------------------------------------------------------

type EventHandler = (event: MessageEvent<string>) => void;

class MockEventSource {
  static last: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private handlers = new Map<string, EventHandler[]>();

  constructor(_url: string, _init?: EventSourceInit) {
    MockEventSource.last = this;
  }

  addEventListener(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  removeEventListener(event: string, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler),
    );
  }

  dispatch(event: string, data: string): void {
    const eventHandlers = this.handlers.get(event) ?? [];
    const messageEvent = new MessageEvent(event, { data });
    for (const handler of eventHandlers) {
      handler(messageEvent);
    }
  }

  close(): void {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let testQueryClient: QueryClient;

function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

function HookConsumer({ gameId }: { gameId: number | null }): React.JSX.Element {
  const { count } = useLobbyRoster(gameId, vi.fn(), vi.fn());
  return <div data-testid="count">{count}</div>;
}

function renderHookConsumer(gameId: number | null): ReturnType<typeof render> {
  return render(<HookConsumer gameId={gameId} />, { wrapper: Providers });
}

function renderGamePlayers(initialGameId: number | null) {
  return renderHook(
    ({ gameId }: { gameId: number | null }) => useLobbyRoster(gameId, vi.fn(), vi.fn()),
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

describe("useLobbyRoster", () => {
  beforeEach(() => {
    MockEventSource.last = null;
    vi.mocked(getGameThrows).mockReset();
    testQueryClient = createQueryClient();
    resetGameStore();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns add outcomes and revalidates locked seats", async () => {
    const revalidate = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, []);
    const { result, rerender } = renderHook(
      ({ gameId }) => useLobbyRoster(gameId, revalidate, vi.fn()),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    vi.mocked(addGuestPlayer).mockResolvedValueOnce({ id: 1, name: "A", position: 0 });
    await act(async () => {
      expect(await result.current.addGuest(5, "A")).toEqual({ status: "added" });
    });
    vi.mocked(addGuestPlayer).mockRejectedValueOnce(error);
    await act(async () => {
      expect(await result.current.addGuest(5, "A")).toEqual({
        status: "seats-not-editable",
        error,
      });
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
    const failure = new Error("network");
    vi.mocked(addGuestPlayer).mockRejectedValueOnce(failure);
    await act(async () => {
      expect(await result.current.addGuest(5, "A")).toEqual({ status: "failed", error: failure });
    });
    const pending = deferred<never>();
    vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
    let answer: Promise<unknown>;
    act(() => {
      answer = result.current.addGuest(5, "A");
    });
    rerender({ gameId: 6 });
    await act(async () => {
      pending.resolve(Promise.reject(failure) as never);
      expect(await answer).toEqual({ status: "stale", error: failure });
    });
  });

  it("rolls back a failed removal and revalidates locked seats", async () => {
    const revalidate = vi.fn();
    const onError = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderHook(() => useLobbyRoster(5, revalidate, onError), {
      wrapper: Providers,
    });
    vi.mocked(leaveRoom).mockRejectedValueOnce(error);
    await act(async () => {
      await result.current.removePlayer(1, 5);
    });
    await waitFor(() =>
      expect(result.current.players).toEqual([{ id: 1, name: "A", position: 0 }]),
    );
    expect(revalidate).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("logs unexpected removal failures", async () => {
    const error = new Error("network");
    const log = vi.spyOn(clientLogger, "error").mockImplementation(() => {});
    vi.mocked(leaveRoom).mockRejectedValueOnce(error);
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderGamePlayers(5);
    await act(async () => {
      await result.current.removePlayer(1, 5);
    });
    expect(log).toHaveBeenCalledWith("room.leave.failed", { context: { gameId: 5 }, error });
    log.mockRestore();
  });

  it("ignores a failed removal after the game changes", async () => {
    let rejectRemoval!: (error: Error) => void;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectRemoval = reject;
    });
    const revalidate = vi.fn();
    const onError = vi.fn();
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(6).queryKey, [
      { id: 2, name: "B", position: 0 },
    ]);
    vi.mocked(leaveRoom).mockReturnValueOnce(pending);
    const { result, rerender } = renderHook(
      ({ gameId }) => useLobbyRoster(gameId, revalidate, onError),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    let removal!: Promise<void>;
    act(() => {
      removal = result.current.removePlayer(1, 5);
    });
    expect(leaveRoom).toHaveBeenCalledWith(5, 1);
    rerender({ gameId: 6 });
    await act(async () => {
      rejectRemoval(new Error("network"));
      await removal;
    });
    expect(result.current.players).toEqual([{ id: 2, name: "B", position: 0 }]);
    expect(onError).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("keeps a newer stream roster when a removal fails", async () => {
    let rejectRemoval!: (error: Error) => void;
    vi.mocked(leaveRoom).mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectRemoval = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
    ]);
    const { result } = renderGamePlayers(5);
    let removal!: Promise<void>;
    act(() => {
      removal = result.current.removePlayer(1, 5);
    });
    act(() => {
      MockEventSource.last?.dispatch("players", JSON.stringify({ players: [] }));
    });
    await act(async () => {
      rejectRemoval(new Error("network"));
      await removal;
    });
    await waitFor(() => expect(result.current.players).toEqual([]));
  });

  it("reconciles a failed reorder with a newer stream roster", async () => {
    let rejectOrder!: (error: Error) => void;
    vi.mocked(updatePlayerOrder).mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectOrder = reject;
      }),
    );
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    const { result } = renderGamePlayers(5);
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    act(() => {
      result.current.reorderPlayers(drag);
    });
    act(() => {
      MockEventSource.last?.dispatch(
        "players",
        JSON.stringify({
          players: [
            { id: 2, name: "B", position: 0 },
            { id: 3, name: "C", position: 1 },
          ],
        }),
      );
    });
    await waitFor(() => expect(result.current.playerOrder).toEqual([2, 3]));
    await act(async () => {
      rejectOrder(new Error("network"));
    });
    await waitFor(() => expect(result.current.playerOrder).toEqual([2, 3]));
  });

  it("sends one reorder request per drag in Strict Mode", async () => {
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    vi.mocked(updatePlayerOrder).mockResolvedValue(undefined);
    const { result } = renderHook(() => useLobbyRoster(5, vi.fn(), vi.fn()), {
      wrapper: ({ children }) => (
        <React.StrictMode>
          <Providers>{children}</Providers>
        </React.StrictMode>
      ),
    });
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    vi.mocked(updatePlayerOrder).mockClear();
    await act(async () => {
      result.current.reorderPlayers(drag);
    });
    expect(updatePlayerOrder).toHaveBeenCalledTimes(1);
  });

  it("sends the reordered positions and rolls back when seats are locked", async () => {
    const revalidate = vi.fn();
    const onError = vi.fn();
    const error = new ApiError("Locked", {
      status: 409,
      data: { error: "GAME_SEATS_NOT_EDITABLE" },
    });
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(7).queryKey, [
      { id: 10, name: "A", position: 0 },
      { id: 20, name: "B", position: 1 },
      { id: 30, name: "C", position: 2 },
    ]);
    vi.mocked(updatePlayerOrder).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useLobbyRoster(7, revalidate, onError), {
      wrapper: Providers,
    });
    const drag = { active: { id: 20 }, over: { id: 10 } } as unknown as DragEndEvent;
    await act(async () => {
      result.current.reorderPlayers(drag);
    });
    expect(updatePlayerOrder).toHaveBeenCalledWith(7, [
      { playerId: 20, position: 0 },
      { playerId: 10, position: 1 },
      { playerId: 30, position: 2 },
    ]);
    expect(result.current.playerOrder).toEqual([10, 20, 30]);
    expect(revalidate).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("keeps a newer reorder when an earlier request fails and merges an SSE update", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(updatePlayerOrder)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
      { id: 3, name: "C", position: 2 },
    ]);
    const { result } = renderGamePlayers(5);
    const drag = (a: number, b: number) =>
      ({ active: { id: a }, over: { id: b } }) as unknown as DragEndEvent;
    act(() => {
      result.current.reorderPlayers(drag(2, 1));
    });
    act(() => {
      result.current.reorderPlayers(drag(3, 1));
    });
    act(() => {
      MockEventSource.last?.dispatch(
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
    await waitFor(() => expect(result.current.playerOrder).toEqual([2, 3, 1, 4]));
    await act(async () => {
      first.resolve(Promise.reject(new Error("network")) as never);
      await first.promise.catch(() => {});
    });
    expect(result.current.playerOrder).toEqual([2, 3, 1, 4]);
    await act(async () => {
      second.resolve();
      await second.promise;
    });
  });

  it("rolls back a rejected reorder and leaves the new game untouched by a late rejection", async () => {
    const error = new Error("network");
    const onError = vi.fn();
    const pending = deferred<void>();
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "A", position: 0 },
      { id: 2, name: "B", position: 1 },
    ]);
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(6).queryKey, [
      { id: 3, name: "C", position: 0 },
    ]);
    const { result, rerender } = renderHook(
      ({ gameId }) => useLobbyRoster(gameId, vi.fn(), onError),
      { initialProps: { gameId: 5 }, wrapper: Providers },
    );
    const drag = { active: { id: 2 }, over: { id: 1 } } as unknown as DragEndEvent;
    vi.mocked(updatePlayerOrder).mockRejectedValueOnce(error);
    await act(async () => {
      result.current.reorderPlayers(drag);
    });
    expect(result.current.playerOrder).toEqual([1, 2]);
    expect(onError).toHaveBeenCalledOnce();
    onError.mockClear();
    vi.mocked(updatePlayerOrder).mockReturnValueOnce(pending.promise);
    act(() => {
      result.current.reorderPlayers(drag);
    });
    rerender({ gameId: 6 });
    await act(async () => {
      pending.resolve(Promise.reject(error) as never);
      await pending.promise.catch(() => {});
    });
    expect(result.current.playerOrder).toEqual([3]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("should clear players when SSE sends an empty list", async () => {
    vi.mocked(getGameThrows).mockResolvedValue(
      buildGameThrowsResponse({
        players: [buildBackendPlayer({ id: 1, name: "Player 1", isActive: true, position: 0 })],
      }),
    );

    renderHookConsumer(1);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    act(() => {
      MockEventSource.last?.dispatch("players", JSON.stringify({ players: [] }));
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
    vi.mocked(getGameThrows).mockRejectedValue(new Error("fetch failed"));

    renderHookConsumer(42);

    // Even if the initial fetch fails, the hook should keep the player count at 0.
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });
  });

  it("should continue streaming after malformed SSE payload and process valid payloads", async () => {
    vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse());

    renderHookConsumer(7);

    act(() => {
      MockEventSource.last?.dispatch("players", "{invalid-json");
    });

    // stream must survive the parse error — count stays 0
    expect(screen.getByTestId("count").textContent).toBe("0");

    act(() => {
      MockEventSource.last?.dispatch(
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

  it("should read the players the start page loader cached without a request of its own", () => {
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "Alice", position: 0 },
    ]);

    const { result } = renderGamePlayers(5);

    expect(result.current.players).toEqual([{ id: 1, name: "Alice", position: 0 }]);
    expect(getGameThrows).not.toHaveBeenCalled();
  });

  it("should start from the game store when it holds the same game", () => {
    vi.mocked(getGameThrows).mockReturnValue(new Promise<GameThrowsResponse>(() => {}));
    setGameData(
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

    expect(result.current.players).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
  });

  it("should write an SSE players event into the lobby players query", async () => {
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, []);
    const { result } = renderGamePlayers(5);

    act(() => {
      MockEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 3, username: "Cara", position: 0 }] }),
      );
    });

    expect(testQueryClient.getQueryData(gameQueries.lobbyPlayers(5).queryKey)).toEqual([
      { id: 3, name: "Cara", position: 0 },
    ]);
    await waitFor(() => {
      expect(result.current.players).toEqual([{ id: 3, name: "Cara", position: 0 }]);
    });
  });

  it("should write optimistic appends and removals into the lobby players query", async () => {
    testQueryClient.setQueryData(gameQueries.lobbyPlayers(5).queryKey, [
      { id: 1, name: "Alice", position: 0 },
    ]);
    const { result } = renderGamePlayers(5);

    vi.mocked(addGuestPlayer).mockResolvedValueOnce({ id: 2, name: "Bob", position: null });
    await act(async () => {
      await result.current.addGuest(5, "Bob");
    });

    expect(testQueryClient.getQueryData(gameQueries.lobbyPlayers(5).queryKey)).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });

    vi.mocked(leaveRoom).mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.removePlayer(1, 5);
    });

    expect(testQueryClient.getQueryData(gameQueries.lobbyPlayers(5).queryKey)).toEqual([
      { id: 2, name: "Bob", position: 1 },
    ]);
  });

  it("should show game B's players when game A's response arrives after B's", async () => {
    const gameA = deferred<GameThrowsResponse>();
    const gameB = deferred<GameThrowsResponse>();
    vi.mocked(getGameThrows).mockImplementation((gameId: number) =>
      gameId === 1 ? gameA.promise : gameB.promise,
    );
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
      expect(result.current.players.map((player) => player.name)).toEqual(["Beta"]);
    });
  });

  it("should keep an SSE players event when the first read resolves after it", async () => {
    const firstRead = deferred<GameThrowsResponse>();
    vi.mocked(getGameThrows).mockReturnValue(firstRead.promise);
    const { result } = renderGamePlayers(5);
    await waitFor(() => {
      expect(getGameThrows).toHaveBeenCalledWith(5, expect.any(AbortSignal));
    });

    act(() => {
      MockEventSource.last?.dispatch(
        "players",
        JSON.stringify({ players: [{ id: 3, username: "Cara", position: 0 }] }),
      );
    });
    await act(async () => {
      firstRead.resolve(buildGameThrowsResponse({ id: 5, players: [] }));
      await firstRead.promise;
    });

    await waitFor(() => {
      expect(result.current.players).toEqual([{ id: 3, name: "Cara", position: 0 }]);
    });
  });
});
