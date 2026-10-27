// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
}));

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useGamePlayers } from "./useGamePlayers";
import { getGameThrows } from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import { createQueryClient } from "@/shared/query/queryClient";
import { resetGameStore, setGameData } from "@/shared/store";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import type { GameThrowsResponse } from "@/types";

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
  const { count } = useGamePlayers(gameId, vi.fn());
  return <div data-testid="count">{count}</div>;
}

function renderHookConsumer(gameId: number | null): ReturnType<typeof render> {
  return render(<HookConsumer gameId={gameId} />, { wrapper: Providers });
}

function renderGamePlayers(initialGameId: number | null) {
  return renderHook(({ gameId }: { gameId: number | null }) => useGamePlayers(gameId, vi.fn()), {
    initialProps: { gameId: initialGameId },
    wrapper: Providers,
  });
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

describe("useGamePlayers", () => {
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

    act(() => {
      result.current.appendOptimisticPlayer({ id: 2, name: "Bob" });
    });

    expect(testQueryClient.getQueryData(gameQueries.lobbyPlayers(5).queryKey)).toEqual([
      { id: 1, name: "Alice", position: 0 },
      { id: 2, name: "Bob", position: 1 },
    ]);
    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });

    act(() => {
      result.current.removeOptimisticPlayer(1);
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
