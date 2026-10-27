// @vitest-environment jsdom
/**
 * TDD — Ticket 4: Single source of truth for gameId
 *
 * Rule: the page reads the game id from the route param. The route loader has already
 * matched it to the tablet game; the store ($invitation) is cache/preload only.
 */

// ─── shared mocks ────────────────────────────────────────────────────────────

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useNavigate: () => navigateMock,
    useRevalidator: () => ({ revalidate: vi.fn(), state: "idle" }),
  };
});

vi.mock("@/shared/api/game", () => ({
  getGameThrows: vi.fn(),
  startGame: vi.fn(),
}));

vi.mock("@/shared/api/room", () => ({
  createRoom: vi.fn(),
  getInvitation: vi.fn(),
  updatePlayerOrder: vi.fn(),
  leaveRoom: vi.fn(),
  addGuestPlayer: vi.fn(),
}));

import { renderHook } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/shared/query/queryClient";
import React from "react";
import { useStartPage } from "./useStartPage";
import { queryClient } from "@/shared/query/queryClient";
import { getGameThrows } from "@/shared/api/game";
import { getInvitation, updatePlayerOrder } from "@/shared/api/room";
import {
  resetRoomStore,
  resetGameStore,
  resetPreCreateGameSettings,
  setInvitation,
} from "@/shared/store";
import { buildGameThrowsResponse } from "@/shared/types/game.test-support";

// ---------------------------------------------------------------------------
// MockEventSource — browser API boundary stub
// ---------------------------------------------------------------------------

type EventHandler = (event: MessageEvent<string>) => void;

class MockEventSource {
  static last: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private handlers = new Map<string, EventHandler[]>();

  constructor() {
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
// MockAudio — browser API boundary stub
// ---------------------------------------------------------------------------

class MockAudio {
  volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  constructor() {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper(
  path: string,
): ({ children }: { children: React.ReactNode }) => React.ReactElement {
  const queryClient = createQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/start/:id",
            element: React.createElement(React.Fragment, null, children),
          }),
          React.createElement(Route, {
            path: "/start",
            element: React.createElement(React.Fragment, null, children),
          }),
        ),
      ),
    );
  };
}

// ─── shared beforeEach/afterEach ─────────────────────────────────────────────

function sharedBeforeEach(): void {
  vi.clearAllMocks();
  MockEventSource.last = null;
  sessionStorage.clear();
  resetRoomStore();
  resetGameStore();
  resetPreCreateGameSettings();
  queryClient.clear();
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal("Audio", MockAudio);
  vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse({ status: "lobby" }));
  vi.mocked(getInvitation).mockResolvedValue({ gameId: 0, invitationLink: "" });
  vi.mocked(updatePlayerOrder).mockResolvedValue(undefined);
}

function sharedAfterEach(): void {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  resetRoomStore();
  resetGameStore();
}

// ─── useStartPage — gameId derivation ────────────────────────────────────────

describe("useStartPage — gameId is derived exclusively from URL param", () => {
  beforeEach(sharedBeforeEach);
  afterEach(sharedAfterEach);

  it("should return gameId from URL param when route contains a valid id", () => {
    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/42"),
    });

    expect(result.current.gameId).toBe(42);
  });

  it("should return null gameId when URL param is absent, even if invitation has a gameId", () => {
    // URL has no id — invitation gameId must NOT be used as authoritative gameId
    setInvitation({ gameId: 99, invitationLink: "/invite/99" });

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start"),
    });

    expect(result.current.gameId).toBeNull();
  });

  it("should use URL param gameId even when invitation holds a different gameId", () => {
    // URL param is authoritative — invitation value must be ignored for gameId
    setInvitation({ gameId: 99, invitationLink: "/invite/99" });

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/42"),
    });

    expect(result.current.gameId).toBe(42);
  });

  it("should return null gameId when URL param is invalid (non-numeric)", () => {
    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/not-a-number"),
    });

    expect(result.current.gameId).toBeNull();
  });
});
