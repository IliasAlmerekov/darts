// @vitest-environment jsdom
/**
 * TDD — Ticket 4: Single source of truth for gameId
 *
 * Rule: the route param /:id is the ONLY authoritative source.
 * The store ($currentGameId, $invitation) is cache/preload only.
 */

// ─── shared mocks ────────────────────────────────────────────────────────────

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useNavigate: () => navigateMock,
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

import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { resolveGameId } from "./useStartPage";
import { useStartPage } from "./useStartPage";
import { getGameThrows } from "@/shared/api/game";
import { getInvitation, updatePlayerOrder } from "@/shared/api/room";
import {
  resetRoomStore,
  resetGameStore,
  resetPreCreateGameSettings,
  setLastFinishedGameSummary,
  setCurrentGameId,
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
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return React.createElement(
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
    );
  };
}

/** Stable lobby response to prevent restore-effect re-runs during tests. */
function mockLobbyGame(gameId: number): void {
  vi.mocked(getGameThrows).mockResolvedValue(
    buildGameThrowsResponse({ id: gameId, status: "lobby" }),
  );
  vi.mocked(getInvitation).mockResolvedValue({
    gameId,
    invitationLink: `/invite/${gameId}`,
  });
}

// ─── resolveGameId (pure function) ───────────────────────────────────────────

describe("resolveGameId", () => {
  it("should parse valid numeric URL param as gameId", () => {
    expect(resolveGameId("42")).toBe(42);
  });

  it("should return null for non-numeric URL param", () => {
    expect(resolveGameId("abc")).toBeNull();
  });

  it("should return null when URL param is undefined", () => {
    expect(resolveGameId(undefined)).toBeNull();
  });

  it("should return null for empty string URL param", () => {
    expect(resolveGameId("")).toBeNull();
  });

  it("should return null for floating-point string that could be confused as valid", () => {
    expect(resolveGameId("3.7")).toBeNull();
  });

  it("should return null for negative number string", () => {
    expect(resolveGameId("-1")).toBeNull();
  });

  it("should return null for zero", () => {
    // 0 is not a valid game ID
    expect(resolveGameId("0")).toBeNull();
  });

  it("should treat scientific-notation string as numeric when it resolves to a positive integer", () => {
    // Number("1e2") === 100 — isInteger passes, so this is accepted.
    // React Router won't produce such params in practice; documenting the behaviour.
    expect(resolveGameId("1e2")).toBe(100);
  });

  it("should return null for 'NaN' string", () => {
    expect(resolveGameId("NaN")).toBeNull();
  });

  it("should return null for 'Infinity' string", () => {
    expect(resolveGameId("Infinity")).toBeNull();
  });
});

// ─── shared beforeEach/afterEach ─────────────────────────────────────────────

function sharedBeforeEach(): void {
  vi.clearAllMocks();
  MockEventSource.last = null;
  sessionStorage.clear();
  resetRoomStore();
  resetGameStore();
  resetPreCreateGameSettings();
  setLastFinishedGameSummary(null);
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

// ─── useStartPage — redirect behaviour ───────────────────────────────────────

describe("useStartPage — redirect when URL has no gameId", () => {
  beforeEach(sharedBeforeEach);
  afterEach(sharedAfterEach);

  it("should redirect to active game route when no URL param but store has currentGameId", async () => {
    setCurrentGameId(55);

    await act(async () => {
      renderHook(() => useStartPage(), {
        wrapper: makeWrapper("/start"),
      });
    });

    expect(navigateMock).toHaveBeenCalledWith("/start/55", { replace: true });
  });

  it("should NOT redirect when URL param already contains the currentGameId", async () => {
    setCurrentGameId(55);
    // Provide mocks so the restore-effect completes cleanly without looping
    mockLobbyGame(55);

    await act(async () => {
      renderHook(() => useStartPage(), {
        wrapper: makeWrapper("/start/55"),
      });
    });

    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/start/55"),
      expect.objectContaining({ replace: true }),
    );
  });

  it("should NOT redirect when there is neither URL param nor stored gameId", async () => {
    await act(async () => {
      renderHook(() => useStartPage(), {
        wrapper: makeWrapper("/start"),
      });
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
