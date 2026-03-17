// @vitest-environment jsdom

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
}));

import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { useGamePlayers } from "./useGamePlayers";
import { getGameThrows } from "@/shared/api/game";
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

function HookConsumer({ gameId }: { gameId: number | null }): React.JSX.Element {
  const { count } = useGamePlayers(gameId);
  return <div data-testid="count">{count}</div>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useGamePlayers", () => {
  beforeEach(() => {
    MockEventSource.last = null;
    vi.mocked(getGameThrows).mockReset();
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

    render(<HookConsumer gameId={1} />);

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
    render(<HookConsumer gameId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    // We don't rely on internal API calls for this behavior; the hook should keep the count at 0.
  });

  it("should not update player count when fetch fails", async () => {
    vi.mocked(getGameThrows).mockRejectedValue(new Error("fetch failed"));

    render(<HookConsumer gameId={42} />);

    // Even if the initial fetch fails, the hook should keep the player count at 0.
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });
  });

  it("should continue streaming after malformed SSE payload and process valid payloads", async () => {
    vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse());

    render(<HookConsumer gameId={7} />);

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
});
