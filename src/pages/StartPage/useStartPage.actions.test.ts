// @vitest-environment jsdom
import { FakeEventSource } from "@/test/FakeEventSource";

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

import { setSoundEnabled } from "@/shared/services/browser/soundPlayer";
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
// FakeEventSource — browser API boundary stub
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// MockAudio — browser API boundary stub
// ---------------------------------------------------------------------------

const audioSources: string[] = [];

class MockAudio {
  volume = 1;
  currentTime = 0;
  readyState = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  addEventListener = vi.fn();
  constructor(src = "") {
    audioSources.push(src);
  }
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
    FakeEventSource.last = null;
    FakeEventSource.urls = [];
    sessionStorage.clear();
    resetRoomStore();
    resetGameStore();
    resetPreCreateGameSettings();
    queryClient.clear();
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal("Audio", MockAudio);
    audioSources.length = 0;
    setSoundEnabled(true);
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
      firstCall = result.current.create.handleStartGame();
      secondCall = result.current.create.handleStartGame();
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
    queryClient.setQueryData(gameQueries.tablet().queryKey, {
      game: null,
      lastFinishedGameId: null,
    });
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameSettings).mockResolvedValueOnce(
      buildGameSettingsResponse({ startScore: 101 }),
    );
    vi.mocked(startGame).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      await result.current.create.handleStartGame();
    });

    expect(startGame).toHaveBeenCalledWith(10, {
      startScore: 101,
      doubleOut: false,
      tripleOut: false,
      round: 1,
      status: "started",
    });
    expect(navigateMock).toHaveBeenCalledWith("/game/10");
    expect(queryClient.getQueryState(gameQueries.tablet().queryKey)?.isInvalidated).toBe(true);
  });

  it("should play the start sound only while game sound is on", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });
    vi.mocked(getGameSettings).mockResolvedValue(buildGameSettingsResponse());
    vi.mocked(startGame).mockResolvedValue(undefined);
    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    setSoundEnabled(false);
    await act(async () => {
      await result.current.create.handleStartGame();
    });
    expect(audioSources).toEqual([]);

    setSoundEnabled(true);
    await act(async () => {
      await result.current.create.handleStartGame();
    });
    expect(audioSources).toContain("/sounds/start-round-sound.mp3");
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
      firstCall = result.current.create.handleCreateRoom();
      secondCall = result.current.create.handleCreateRoom();
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
    vi.mocked(getGameSettings).mockClear();
    await expect(queryClient.fetchQuery(gameQueries.settings(55))).resolves.toMatchObject({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });
    expect(getGameSettings).not.toHaveBeenCalled();
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
      await result.current.create.handleCreateRoom();
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
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.guest.handleAddGuest();
    });

    expect(addGuestPlayer).toHaveBeenCalledWith(10, { username: "Alex" });
    expect(result.current.guest.guestError).toBe("Username already taken in this game.");
    expect(result.current.guest.guestSuggestions).toEqual(["Alex2", "Alex3"]);
    expect(result.current.guest.isGuestOverlayOpen).toBe(true);
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
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.guest.handleAddGuest();
    });

    expect(result.current.guest.guestError).toBe("Could not add guest. Please try again.");
    expect(result.current.guest.guestSuggestions).toEqual([]);
  });

  it("should prevent duplicate addGuest calls while first request is pending", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });

    const pending = deferred<{ id: number; name: string; position: number | null }>();
    vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("Alex");
    });

    let firstCall = Promise.resolve();
    let secondCall = Promise.resolve();
    await act(async () => {
      firstCall = result.current.guest.handleAddGuest();
      secondCall = result.current.guest.handleAddGuest();
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
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("Alex");
    });

    await act(async () => {
      await result.current.guest.handleAddGuest();
    });

    expect(addGuestPlayer).toHaveBeenCalledWith(10, { username: "Alex" });
    expect(result.current.guest.isGuestOverlayOpen).toBe(false);
    expect(result.current.guest.guestUsername).toBe("");
    expect(result.current.guest.guestError).toBeNull();
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
      expect(result.current.roster.count).toBe(10);
    });

    await act(async () => {
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("Alex");
      await result.current.guest.handleAddGuest();
    });

    expect(addGuestPlayer).not.toHaveBeenCalled();
    expect(result.current.guest.guestError).toBe(
      "The lobby is full. Remove a player to add another.",
    );
  });

  it("should validate guest username requires at least 3 letters before api call", async () => {
    setInvitation({ gameId: 10, invitationLink: "/invite/10" });

    const { result } = renderHook(() => useStartPage(), {
      wrapper: makeWrapper("/start/10"),
    });

    await act(async () => {
      result.current.guest.openGuestOverlay();
      result.current.guest.setGuestUsername("A1-");
    });

    await act(async () => {
      await result.current.guest.handleAddGuest();
    });

    expect(addGuestPlayer).not.toHaveBeenCalled();
    expect(result.current.guest.guestError).toBe("Username must contain at least 3 letters.");
  });

  it("should not remove a seat while the route has no game", async () => {
    const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start") });

    await act(async () => {
      await result.current.roster.remove(2);
    });

    expect(leaveRoom).not.toHaveBeenCalled();
    expect(result.current.pageError).toBeNull();
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

    it("should show a readable message and reload when add guest hits GAME_SEATS_NOT_EDITABLE", async () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      vi.mocked(addGuestPlayer).mockRejectedValueOnce(seatsNotEditable());
      const { result } = renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      await act(async () => {
        result.current.guest.openGuestOverlay();
        result.current.guest.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.guest.handleAddGuest();
      });

      expect(result.current.guest.guestError).toBe(SEATS_MESSAGE);
      expect(result.current.guest.guestSuggestions).toEqual([]);
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
        expect(result.current.roster.seats.some((p) => p.id === 2)).toBe(true);
      });
      await act(async () => {
        await result.current.roster.remove(2);
        result.current.guest.openGuestOverlay();
        result.current.guest.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.guest.handleAddGuest();
      });
      expect(result.current.pageError).toBe(SEATS_MESSAGE);
      expect(result.current.guest.isGuestOverlayOpen).toBe(true);
      expect(result.current.guest.guestError).toBe(SEATS_MESSAGE);

      await act(async () => {
        routerNavigate?.("/start");
      });

      expect(result.current.gameId).toBeNull();
      expect(result.current.pageError).toBeNull();
      expect(result.current.guest.isGuestOverlayOpen).toBe(false);
      expect(result.current.guest.guestError).toBeNull();
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
          expect(rendered.result.current.roster.order).toEqual([1, 2]);
        });
        const moveTo = async (path: string): Promise<void> => {
          await act(async () => {
            nav.go?.(path);
          });
        };
        return { ...rendered, moveTo };
      }

      it("should ignore a late GAME_SEATS_NOT_EDITABLE from add guest", async () => {
        const pending = deferred<never>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.guest.openGuestOverlay();
          result.current.guest.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.guest.handleAddGuest();
        });
        await moveTo("/start/11");
        await act(async () => {
          result.current.guest.openGuestOverlay();
        });
        await act(async () => {
          pending.reject(seatsNotEditable());
          await adding;
        });

        expect(result.current.guest.guestError).toBeNull();
        expect(result.current.guest.isGuestOverlayOpen).toBe(true);
        expect(result.current.guest.isAddingGuest).toBe(false);
        expect(revalidateMock).not.toHaveBeenCalled();
      });

      it("should keep the overlay of the new game open when a stale add guest succeeds", async () => {
        const pending = deferred<Awaited<ReturnType<typeof addGuestPlayer>>>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.guest.openGuestOverlay();
          result.current.guest.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.guest.handleAddGuest();
        });
        await moveTo("/start/11");
        await act(async () => {
          result.current.guest.openGuestOverlay();
        });
        await act(async () => {
          pending.resolve({ id: 9, name: "Alex", position: null });
          await adding;
        });

        expect(result.current.guest.isGuestOverlayOpen).toBe(true);
      });

      it("should log a stale add guest failure that is not a seat conflict or a full lobby", async () => {
        const pending = deferred<never>();
        vi.mocked(addGuestPlayer).mockReturnValueOnce(pending.promise);
        const { result, moveTo } = await renderOnGame10();

        await act(async () => {
          result.current.guest.openGuestOverlay();
          result.current.guest.setGuestUsername("Alex");
        });
        let adding = Promise.resolve();
        await act(async () => {
          adding = result.current.guest.handleAddGuest();
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

        expect(result.current.guest.guestError).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith("room.guest.stale-answer", {
          context: { gameId: 10 },
          error: failure,
        });
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
        result.current.guest.openGuestOverlay();
        result.current.guest.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.guest.handleAddGuest();
      });

      expect(result.current.guest.guestError).toBe(
        "The lobby is full. Remove a player to add another.",
      );
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
        result.current.guest.openGuestOverlay();
        result.current.guest.setGuestUsername("Alex");
      });
      await act(async () => {
        await result.current.guest.handleAddGuest();
      });

      expect(result.current.guest.guestSuggestions).toEqual(["Alex2"]);
      expect(revalidateMock).not.toHaveBeenCalled();
    });
  });

  describe("room stream closed", () => {
    it("should revalidate the route when the room stream closes", () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      act(() => {
        FakeEventSource.last?.fail(FakeEventSource.CLOSED);
      });

      expect(revalidateMock).toHaveBeenCalledTimes(1);
    });

    it("should revalidate and open the same room stream again after the backoff delay", () => {
      vi.useFakeTimers();
      try {
        setInvitation({ gameId: 10, invitationLink: "/invite/10" });
        renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

        act(() => {
          FakeEventSource.last?.fail(FakeEventSource.CLOSED);
        });

        expect(revalidateMock).toHaveBeenCalledTimes(1);
        expect(FakeEventSource.urls).toEqual(["/api/room/10/stream"]);

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(FakeEventSource.urls).toEqual(["/api/room/10/stream", "/api/room/10/stream"]);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should not revalidate the route when the room stream fails while reconnecting", () => {
      setInvitation({ gameId: 10, invitationLink: "/invite/10" });
      renderHook(() => useStartPage(), { wrapper: makeWrapper("/start/10") });

      act(() => {
        FakeEventSource.last?.fail(FakeEventSource.CONNECTING);
      });

      expect(revalidateMock).not.toHaveBeenCalled();
    });
  });
});
