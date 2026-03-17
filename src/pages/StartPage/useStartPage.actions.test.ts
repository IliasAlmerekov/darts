// @vitest-environment jsdom

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
  getGameSettings: vi.fn(),
  startGame: vi.fn(),
}));

vi.mock("@/shared/api/room", () => ({
  createRoom: vi.fn(),
  getInvitation: vi.fn(),
  updatePlayerOrder: vi.fn(),
  leaveRoom: vi.fn(),
  addGuestPlayer: vi.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { ApiError } from "@/shared/api";
import { getGameThrows, getGameSettings, startGame } from "@/shared/api/game";
import {
  createRoom,
  getInvitation,
  updatePlayerOrder,
  leaveRoom,
  addGuestPlayer,
} from "@/shared/api/room";
import { useStartPage } from "./useStartPage";
import {
  resetRoomStore,
  resetGameStore,
  resetPreCreateGameSettings,
  setLastFinishedGameSummary,
  setInvitation,
  setPreCreateGameSettings,
} from "@/shared/store";
import {
  buildBackendPlayer,
  buildGameSettingsResponse,
  buildGameThrowsResponse,
} from "@/shared/types/game.test-support";

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

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {
    throw new Error("Attempted to resolve promise before it was initialized");
  };
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStartPage action guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.last = null;
    sessionStorage.clear();
    resetRoomStore();
    resetGameStore();
    resetPreCreateGameSettings();
    setLastFinishedGameSummary(null);
    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal("Audio", MockAudio);
    vi.mocked(getGameThrows).mockResolvedValue(buildGameThrowsResponse());
    vi.mocked(getInvitation).mockResolvedValue({ gameId: 0, invitationLink: "" });
    vi.mocked(updatePlayerOrder).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    resetRoomStore();
    resetGameStore();
  });

  it("should prevent duplicate startGame calls while first request is pending", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameSettings).mockResolvedValueOnce(
      buildGameSettingsResponse({ startScore: 101, doubleOut: true }),
    );

    const pending = deferred<void>();
    vi.mocked(startGame).mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.handleStartGame();
      secondCall = result.current.handleStartGame();
    });

    expect(getGameSettings).toHaveBeenCalledTimes(1);
    expect(startGame).toHaveBeenCalledTimes(1);
    expect(startGame).toHaveBeenCalledWith(10, {
      startScore: 101,
      doubleOut: true,
      tripleOut: false,
      round: 1,
      status: "started",
    });

    await act(async () => {
      pending.resolve();
      await firstCall;
      await secondCall;
    });

    expect(navigateMock).toHaveBeenCalledWith("/game/10");
  });

  it("should start with canonical room settings and clear stale game state before navigation", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameSettings).mockResolvedValueOnce(
      buildGameSettingsResponse({ startScore: 101 }),
    );
    vi.mocked(startGame).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      await result.current.handleStartGame();
    });

    expect(startGame).toHaveBeenCalledWith(10, {
      startScore: 101,
      doubleOut: false,
      tripleOut: false,
      round: 1,
      status: "started",
    });
    expect(navigateMock).toHaveBeenCalledWith("/game/10");
  });

  it("should prevent duplicate createRoom calls while first request is pending", async () => {
    setLastFinishedGameSummary({ gameId: 77, summary: [] });
    setPreCreateGameSettings(buildGameSettingsResponse({ doubleOut: true }));
    const pending = deferred<{ gameId: number; invitationLink: string }>();
    vi.mocked(createRoom).mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start"),
    });

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.handleCreateRoom();
      secondCall = result.current.handleCreateRoom();
    });

    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(createRoom).toHaveBeenCalledWith({
      previousGameId: 77,
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    await act(async () => {
      pending.resolve({ gameId: 55, invitationLink: "/invite/55" });
      await firstCall;
      await secondCall;
    });

    expect(result.current.invitation).toEqual({
      gameId: 55,
      invitationLink: "/invite/55",
    });
    expect(navigateMock).toHaveBeenCalledWith("/start/55");
  });

  it("should show username taken suggestions when guest nickname already exists in current game", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(addGuestPlayer).mockRejectedValueOnce(
      new ApiError("Request failed", {
        status: 409,
        data: {
          success: false,
          error: "USERNAME_TAKEN",
          message: "Username already taken in this game.",
          suggestions: ["Alex2", "Alex3"],
        },
      }),
    );

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.handleAddGuest();
    });

    expect(addGuestPlayer).toHaveBeenCalledWith(10, { username: "Alex" });
    expect(result.current.guestError).toBe("Username already taken in this game.");
    expect(result.current.guestSuggestions).toEqual(["Alex2", "Alex3"]);
    expect(result.current.isGuestOverlayOpen).toBe(true);
  });

  it("should fall back to a generic guest error when the 409 payload shape is invalid", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(addGuestPlayer).mockRejectedValueOnce(
      new ApiError("Request failed", {
        status: 409,
        data: {
          success: false,
          error: "USERNAME_TAKEN",
          suggestions: ["Alex2", 3],
        },
      }),
    );

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.handleAddGuest();
    });

    expect(result.current.guestError).toBe("Could not add guest. Please try again.");
    expect(result.current.guestSuggestions).toEqual([]);
  });

  it("should prevent duplicate addGuest calls while first request is pending", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });

    const pending = deferred<{ id: number; name: string }>();
    vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
    });

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.handleAddGuest();
      secondCall = result.current.handleAddGuest();
    });

    expect(addGuestPlayer).toHaveBeenCalledTimes(1);
    expect(addGuestPlayer).toHaveBeenCalledWith(10, { username: "Alex" });

    await act(async () => {
      pending.resolve({ id: 1, name: "Alex" });
      await firstCall;
      await secondCall;
    });
  });

  it("should close guest overlay after successful guest creation", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(addGuestPlayer).mockResolvedValueOnce({ id: 1, name: "Alex" });

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.handleAddGuest();
    });

    expect(addGuestPlayer).toHaveBeenCalledWith(10, { username: "Alex" });
    expect(result.current.isGuestOverlayOpen).toBe(false);
    expect(result.current.guestUsername).toBe("");
    expect(result.current.guestError).toBeNull();
  });

  it("should block guest creation when lobby is full", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameThrows).mockResolvedValueOnce(
      buildGameThrowsResponse({
        id: 10,
        players: Array.from({ length: 10 }, (_, i) =>
          buildBackendPlayer({
            id: i + 1,
            name: `Player ${i + 1}`,
            isActive: i === 0,
            position: i,
          }),
        ),
      }),
    );

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await waitFor(() => {
      expect(result.current.playerCount).toBe(10);
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
      await result.current.handleAddGuest();
    });

    expect(addGuestPlayer).not.toHaveBeenCalled();
    expect(result.current.guestError).toBe("The lobby is full. Remove a player to add another.");
  });

  it("should validate guest username requires at least 3 letters before api call", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("A1-");
    });

    await act(async () => {
      await result.current.handleAddGuest();
    });

    expect(addGuestPlayer).not.toHaveBeenCalled();
    expect(result.current.guestError).toBe("Username must contain at least 3 letters.");
  });

  it("should use the latest players snapshot for remove rollback after rerender", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameThrows).mockResolvedValue(
      buildGameThrowsResponse({
        id: 10,
        players: [buildBackendPlayer({ id: 2, name: "Sam", isActive: true, position: 1 })],
      }),
    );
    vi.mocked(leaveRoom).mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await waitFor(() => {
      expect(result.current.players.some((p) => p.id === 2)).toBe(true);
    });

    const removePlayer = result.current.handleRemovePlayer;

    await act(async () => {
      await removePlayer(2, 10);
    });

    expect(leaveRoom).toHaveBeenCalledWith(10, 2);
    expect(result.current.players.some((p) => p.id === 2)).toBe(true);
  });
});
