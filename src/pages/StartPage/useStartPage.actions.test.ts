// @vitest-environment jsdom

const navigateMock = vi.fn();
const revalidateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useNavigate: () => navigateMock,
    useRevalidator: () => ({ revalidate: revalidateMock, state: "idle" }),
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
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/shared/query/queryClient";
import { gameQueries } from "@/shared/query/game.queries";
import React from "react";
import { ApiError } from "@/shared/api";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { getGameThrows, getGameSettings, startGame } from "@/shared/api/game";
import {
  createRoom,
  getInvitation,
  updatePlayerOrder,
  leaveRoom,
  addGuestPlayer,
} from "@/shared/api/room";
import { useStartPage } from "./useStartPage";
import { queryClient } from "@/shared/query/queryClient";
import {
  resetRoomStore,
  resetGameStore,
  resetPreCreateGameSettings,
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
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSED = 2 as const;
  static last: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState: 0 | 1 | 2 = MockEventSource.CONNECTING;

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

  fail(readyState: 0 | 1 | 2): void {
    this.readyState = readyState;
    this.onerror?.();
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
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {
    throw new Error("Attempted to resolve promise before it was initialized");
  };
  let reject: (reason: unknown) => void = () => {
    throw new Error("Attempted to reject promise before it was initialized");
  };
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function makeWrapper(
  path: string,
  queryClient = createQueryClient(),
): ({ children }: { children: React.ReactNode }) => React.ReactElement {
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
    queryClient.clear();
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

  it("should make routes read the tablet game again after a room is created", async () => {
    const client = createQueryClient();
    client.setQueryData(gameQueries.tablet().queryKey, { game: null, lastFinishedGameId: 54 });
    vi.mocked(createRoom).mockResolvedValueOnce({ gameId: 55, invitationLink: "/invite/55" });
    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start", client),
    });

    await act(async () => {
      await result.current.handleCreateRoom();
    });

    expect(client.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
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

    const pending = deferred<{ id: number; name: string; position: number | null }>();
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
      pending.resolve({ id: 1, name: "Alex", position: null });
      await firstCall;
      await secondCall;
    });
  });

  it("should close guest overlay after successful guest creation", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(addGuestPlayer).mockResolvedValueOnce({ id: 1, name: "Alex", position: null });

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

  describe("seat conflicts", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(clientLogger, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    const SEATS_MESSAGE = "This game has already started. The lobby can no longer be changed.";

    function seatsNotEditable(): ApiError {
      return new ApiError("Conflict", {
        status: 409,
        data: {
          success: false,
          error: "GAME_SEATS_NOT_EDITABLE",
          message: "Seats can only change in the lobby.",
        },
      });
    }

    async function renderLobbyWithPlayer(): Promise<
      ReturnType<typeof renderHook<ReturnType<typeof useStartPage>, unknown>>
    > {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(getGameThrows).mockResolvedValue(
        buildGameThrowsResponse({
          id: 10,
          players: [buildBackendPlayer({ id: 2, name: "Sam", isActive: true, position: 1 })],
        }),
      );
      const rendered = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });
      await waitFor(() => {
        expect(rendered.result.current.players.some((p) => p.id === 2)).toBe(true);
      });
      return rendered;
    }

    it("should restore the removed player, show a readable message and reload when remove hits GAME_SEATS_NOT_EDITABLE", async () => {
      vi.mocked(leaveRoom).mockRejectedValueOnce(seatsNotEditable());
      const { result } = await renderLobbyWithPlayer();

      await act(async () => {
        await result.current.handleRemovePlayer(2, 10);
      });

      expect(result.current.players.some((p) => p.id === 2)).toBe(true);
      expect(result.current.pageError).toBe(SEATS_MESSAGE);
      expect(result.current.invitation?.gameId).toBe(10);
      expect(revalidateMock).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "room.leave.seats-not-editable",
        expect.objectContaining({ context: { gameId: 10 } }),
      );
    });

    it("should roll back the order, show a readable message and reload when reorder hits GAME_SEATS_NOT_EDITABLE", async () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(getGameThrows).mockResolvedValue(
        buildGameThrowsResponse({
          id: 10,
          players: [
            buildBackendPlayer({ id: 1, name: "Ann", isActive: true, position: 0 }),
            buildBackendPlayer({ id: 2, name: "Sam", isActive: true, position: 1 }),
          ],
        }),
      );
      vi.mocked(updatePlayerOrder).mockRejectedValueOnce(seatsNotEditable());
      const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });
      await waitFor(() => {
        expect(result.current.playerOrder).toEqual([1, 2]);
      });

      await act(async () => {
        result.current.handleDragEnd({
          active: { id: 2 },
          over: { id: 1 },
        } as unknown as Parameters<typeof result.current.handleDragEnd>[0]);
      });

      await waitFor(() => {
        expect(result.current.pageError).toBe(SEATS_MESSAGE);
      });
      expect(result.current.playerOrder).toEqual([1, 2]);
      expect(revalidateMock).toHaveBeenCalledTimes(1);
    });

    it("should show a readable message and reload when add guest hits GAME_SEATS_NOT_EDITABLE", async () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(addGuestPlayer).mockRejectedValueOnce(seatsNotEditable());
      const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      await act(async () => {
        result.current.openGuestOverlay();
        result.current.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.handleAddGuest();
      });

      expect(result.current.guestError).toBe(SEATS_MESSAGE);
      expect(result.current.guestSuggestions).toEqual([]);
      expect(revalidateMock).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "room.guest.seats-not-editable",
        expect.objectContaining({ context: { gameId: 10 } }),
      );
    });

    it("should clear the page error and close the guest overlay when the route game id changes after a conflict", async () => {
      const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
      let routerNavigate: ReturnType<typeof actual.useNavigate> | null = null;
      function NavigateProbe(): null {
        routerNavigate = actual.useNavigate();
        return null;
      }
      const Wrapper = makeWrapper("/start/10");
      vi.mocked(leaveRoom).mockRejectedValueOnce(seatsNotEditable());
      vi.mocked(addGuestPlayer).mockRejectedValueOnce(seatsNotEditable());
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(getGameThrows).mockResolvedValue(
        buildGameThrowsResponse({
          id: 10,
          players: [buildBackendPlayer({ id: 2, name: "Sam", isActive: true, position: 1 })],
        }),
      );
      const { result } = renderHook(() => useStartPage(), {
        wrapper: ({ children }) =>
          React.createElement(Wrapper, null, React.createElement(NavigateProbe), children),
      });
      await waitFor(() => {
        expect(result.current.players.some((p) => p.id === 2)).toBe(true);
      });
      await act(async () => {
        await result.current.handleRemovePlayer(2, 10);
        result.current.openGuestOverlay();
        result.current.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.handleAddGuest();
      });
      expect(result.current.pageError).toBe(SEATS_MESSAGE);
      expect(result.current.isGuestOverlayOpen).toBe(true);
      expect(result.current.guestError).toBe(SEATS_MESSAGE);

      await act(async () => {
        routerNavigate?.("/start");
      });

      expect(result.current.gameId).toBeNull();
      expect(result.current.pageError).toBeNull();
      expect(result.current.isGuestOverlayOpen).toBe(false);
      expect(result.current.guestError).toBeNull();
    });

    describe("answers that arrive after the route moved to another game", () => {
      async function renderOnGame10() {
        const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
        const nav: { go: ReturnType<typeof actual.useNavigate> | null } = { go: null };
        function NavigateProbe(): null {
          nav.go = actual.useNavigate();
          return null;
        }
        const Wrapper = makeWrapper("/start/10");
        setInvitation({ gameId: 10, invitationLink: "/invite/10" });
        vi.mocked(getGameThrows).mockImplementation(async (id: number) =>
          buildGameThrowsResponse({
            id,
            players:
              id === 10
                ? [
                    buildBackendPlayer({ id: 1, name: "Ann", isActive: true, position: 0 }),
                    buildBackendPlayer({ id: 2, name: "Sam", isActive: true, position: 1 }),
                  ]
                : [
                    buildBackendPlayer({ id: 3, name: "Bob", isActive: true, position: 0 }),
                    buildBackendPlayer({ id: 4, name: "Cy", isActive: true, position: 1 }),
                  ],
          }),
        );
        const rendered = renderHook(() => useStartPage(), {
          wrapper: ({ children }) =>
            React.createElement(Wrapper, null, React.createElement(NavigateProbe), children),
        });
        await waitFor(() => {
          expect(rendered.result.current.playerOrder).toEqual([1, 2]);
        });
        const moveTo = async (path: string): Promise<void> => {
          await act(async () => {
            nav.go?.(path);
          });
        };
        return { ...rendered, moveTo };
      }

      it("should ignore a late GAME_SEATS_NOT_EDITABLE from remove player", async () => {
        const pending = deferred<void>();
        vi.mocked(leaveRoom).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        let removal = Promise.resolve();
        await act(async () => {
          removal = result.current.handleRemovePlayer(2, 10);
        });
        await moveTo("/start/11");
        await waitFor(() => {
          expect(result.current.playerOrder).toEqual([3, 4]);
        });
        await act(async () => {
          pending.reject(seatsNotEditable());
          await removal;
        });

        expect(result.current.pageError).toBeNull();
        expect(revalidateMock).not.toHaveBeenCalled();
        expect(result.current.players.map((p) => p.id)).toEqual([3, 4]);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          "room.leave.seats-not-editable",
          expect.objectContaining({ context: { gameId: 10 } }),
        );
      });

      it("should ignore a late GAME_SEATS_NOT_EDITABLE from add guest", async () => {
        const pending = deferred<never>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.openGuestOverlay();
          result.current.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.handleAddGuest();
        });
        await moveTo("/start/11");
        await act(async () => {
          result.current.openGuestOverlay();
        });
        await act(async () => {
          pending.reject(seatsNotEditable());
          await adding;
        });

        expect(result.current.guestError).toBeNull();
        expect(result.current.isGuestOverlayOpen).toBe(true);
        expect(result.current.isAddingGuest).toBe(false);
        expect(revalidateMock).not.toHaveBeenCalled();
      });

      it("should keep the overlay of the new game open when a stale add guest succeeds", async () => {
        const pending = deferred<Awaited<ReturnType<typeof addGuestPlayer>>>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.openGuestOverlay();
          result.current.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.handleAddGuest();
        });
        await moveTo("/start/11");
        await act(async () => {
          result.current.openGuestOverlay();
        });
        await act(async () => {
          pending.resolve({ id: 9, name: "Alex", position: null });
          await adding;
        });

        expect(result.current.isGuestOverlayOpen).toBe(true);
      });

      it("should log a stale remove failure that is not a seat conflict", async () => {
        const pending = deferred<void>();
        vi.mocked(leaveRoom).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        let removal = Promise.resolve();
        await act(async () => {
          removal = result.current.handleRemovePlayer(2, 10);
        });
        await moveTo("/start/11");
        const failure = new ApiError("Server error", { status: 500, data: null });
        await act(async () => {
          pending.reject(failure);
          await removal;
        });

        expect(result.current.pageError).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith("room.leave.stale-answer", {
          context: { gameId: 10 },
          error: failure,
        });
      });

      it("should log a stale add guest failure that is not a seat conflict or a full lobby", async () => {
        const pending = deferred<never>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.openGuestOverlay();
          result.current.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.handleAddGuest();
        });
        await moveTo("/start/11");
        const failure = new ApiError("Conflict", {
          status: 409,
          data: { success: false, error: "USERNAME_TAKEN", message: "Taken." },
        });
        await act(async () => {
          pending.reject(failure);
          await adding;
        });

        expect(result.current.guestError).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith("room.guest.stale-answer", {
          context: { gameId: 10 },
          error: failure,
        });
      });

      it("should not roll back the order of the new game or reload on a late conflict from reorder", async () => {
        const pending = deferred<void>();
        vi.mocked(updatePlayerOrder).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.handleDragEnd({
            active: { id: 2 },
            over: { id: 1 },
          } as unknown as Parameters<typeof result.current.handleDragEnd>[0]);
        });
        await moveTo("/start/11");
        await waitFor(() => {
          expect(result.current.playerOrder).toEqual([3, 4]);
        });
        await act(async () => {
          pending.reject(seatsNotEditable());
          await Promise.resolve();
        });

        expect(result.current.pageError).toBeNull();
        expect(result.current.playerOrder).toEqual([3, 4]);
        expect(revalidateMock).not.toHaveBeenCalled();
      });
    });

    it("should show the lobby full message and not reload when add guest hits GAME_ROOM_FULL", async () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(addGuestPlayer).mockRejectedValueOnce(
        new ApiError("Conflict", {
          status: 409,
          data: { success: false, error: "GAME_ROOM_FULL", message: "Room is full." },
        }),
      );
      const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      await act(async () => {
        result.current.openGuestOverlay();
        result.current.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.handleAddGuest();
      });

      expect(result.current.guestError).toBe("The lobby is full. Remove a player to add another.");
      expect(revalidateMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "room.guest.lobby-full",
        expect.objectContaining({ context: { gameId: 10 } }),
      );
    });

    it("should not reload after USERNAME_TAKEN", async () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(addGuestPlayer).mockRejectedValueOnce(
        new ApiError("Conflict", {
          status: 409,
          data: {
            success: false,
            error: "USERNAME_TAKEN",
            message: "Username already taken in this game.",
            suggestions: ["Alex2"],
          },
        }),
      );
      const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      await act(async () => {
        result.current.openGuestOverlay();
        result.current.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.handleAddGuest();
      });

      expect(result.current.guestSuggestions).toEqual(["Alex2"]);
      expect(revalidateMock).not.toHaveBeenCalled();
    });
  });

  describe("room stream closed", () => {
    it("should revalidate the route when the room stream closes", () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      act(() => {
        MockEventSource.last?.fail(MockEventSource.CLOSED);
      });

      expect(revalidateMock).toHaveBeenCalledTimes(1);
    });

    it("should not revalidate the route when the room stream fails while reconnecting", () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      act(() => {
        MockEventSource.last?.fail(MockEventSource.CONNECTING);
      });

      expect(revalidateMock).not.toHaveBeenCalled();
    });
  });
});
