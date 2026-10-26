// @vitest-environment jsdom

// ── API mocks (the only external boundary) ───────────────────────────────────
vi.mock("@/shared/api/game", () => ({
  getTabletGame: vi.fn(),
  getGameThrows: vi.fn(),
}));

vi.mock("@/shared/api/room", () => ({
  getInvitation: vi.fn(),
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameThrows, getTabletGame, type TabletGameResponse } from "@/shared/api/game";
import { getInvitation } from "@/shared/api/room";
import { startPageLoader } from "@/pages/StartPage/startPageLoader";
import { queryClient } from "@/shared/query/queryClient";
import { tabletGameLoader } from "@/shared/query/tabletGameLoader";
import {
  $currentGameId,
  $invitation,
  resetGameStore,
  resetRoomStore,
  setCurrentGameId,
  setInvitation,
} from "@/shared/store";
import { UniversalSkeleton } from "@/shared/ui/skeletons";
import { buildGameThrowsResponse } from "@/shared/types/game.test-support";
import ErrorBoundary from "@/app/ErrorBoundary";
import AdminLayoutRoute from "./AdminLayoutRoute";
import TabletGameGate from "./TabletGameGate";

const getTabletGameMock = vi.mocked(getTabletGame);
const getGameThrowsMock = vi.mocked(getGameThrows);
const getInvitationMock = vi.mocked(getInvitation);

const NO_TABLET_GAME: TabletGameResponse = { game: null, lastFinishedGameId: 5 };
const LOBBY_7: TabletGameResponse = { game: { id: 7, status: "lobby" }, lastFinishedGameId: 5 };
const STARTED_7: TabletGameResponse = {
  game: { id: 7, status: "started" },
  lastFinishedGameId: 5,
};

function StubPage({ name }: { name: string }): React.JSX.Element {
  const { pathname } = useLocation();
  return <h1>{`${name} ${pathname}`}</h1>;
}

function gated(name: string): React.JSX.Element {
  return (
    <TabletGameGate>
      <StubPage name={name} />
    </TabletGameGate>
  );
}

// Mirrors the admin routes in App.tsx with stub pages.
function renderAdminRoutes(entries: string[]): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      {
        element: <AdminLayoutRoute />,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "/start/:id?",
            loader: startPageLoader,
            hydrateFallbackElement: <UniversalSkeleton />,
            element: gated("Start"),
          },
          {
            path: "/settings/:id?",
            loader: tabletGameLoader("settings"),
            hydrateFallbackElement: <UniversalSkeleton />,
            element: gated("Settings"),
          },
          { path: "/statistics", element: <StubPage name="Statistics" /> },
        ],
      },
      {
        path: "/game/:id",
        loader: tabletGameLoader("game"),
        hydrateFallbackElement: <UniversalSkeleton />,
        element: gated("Game"),
      },
      { path: "/summary/:id", element: <StubPage name="Summary" /> },
    ],
    { initialEntries: entries, initialIndex: entries.length - 1 },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

async function expectPage(name: string): Promise<void> {
  expect(await screen.findByRole("heading", { name })).toBeTruthy();
}

beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
  resetGameStore();
  resetRoomStore();
  getGameThrowsMock.mockImplementation((gameId) =>
    Promise.resolve(buildGameThrowsResponse({ id: gameId, status: "lobby" })),
  );
  getInvitationMock.mockImplementation((gameId) =>
    Promise.resolve({ success: true, gameId, invitationLink: `/invite/${gameId}` }),
  );
});

describe("admin routes follow the tablet game", () => {
  describe("tablet game in the lobby", () => {
    beforeEach(() => {
      getTabletGameMock.mockResolvedValue(LOBBY_7);
    });

    it.each([
      ["/start/3", "Start /start/7"],
      ["/start", "Start /start/7"],
      ["/game/3", "Start /start/7"],
      ["/game/7", "Start /start/7"],
      ["/settings/3", "Settings /settings/7"],
      ["/settings", "Settings /settings/7"],
    ])("should send %s to %s", async (path, page) => {
      renderAdminRoutes([path]);

      await expectPage(page);
    });

    it("should open /start/7 and load the lobby of game 7", async () => {
      renderAdminRoutes(["/start/7"]);

      await expectPage("Start /start/7");
      expect(getGameThrowsMock).toHaveBeenCalledWith(7, expect.any(AbortSignal));
      expect(getGameThrowsMock).not.toHaveBeenCalledWith(3, expect.anything());
    });
  });

  describe("tablet game started", () => {
    beforeEach(() => {
      getTabletGameMock.mockResolvedValue(STARTED_7);
    });

    it.each([
      ["/start/3", "Game /game/7"],
      ["/start/7", "Game /game/7"],
      ["/game/3", "Game /game/7"],
      ["/game/7", "Game /game/7"],
      ["/settings/3", "Settings /settings/7"],
      ["/settings", "Settings /settings/7"],
    ])("should send %s to %s", async (path, page) => {
      renderAdminRoutes([path]);

      await expectPage(page);
    });

    // #202: a game id in the URL never leaves the started game. The start page, and with it
    // the Start action, never renders: its loader redirects before loading the lobby.
    it("should land /start on the started game without loading the lobby", async () => {
      renderAdminRoutes(["/start"]);

      await expectPage("Game /game/7");
      expect(screen.queryByRole("heading", { name: /^Start/ })).toBeNull();
      expect(getGameThrowsMock).not.toHaveBeenCalled();
    });
  });

  describe("no tablet game", () => {
    beforeEach(() => {
      getTabletGameMock.mockResolvedValue(NO_TABLET_GAME);
    });

    it.each([
      ["/start/3", "Start /start"],
      ["/start", "Start /start"],
      ["/game/3", "Start /start"],
      ["/settings/3", "Settings /settings"],
      ["/settings", "Settings /settings"],
    ])("should send %s to %s", async (path, page) => {
      renderAdminRoutes([path]);

      await expectPage(page);
    });
  });

  describe("invalid id", () => {
    it.each(
      ["/start", "/settings"].flatMap((base) =>
        ["-5", "0", "abc", "1e3"].map((id) => `${base}/${id}`),
      ),
    )("should answer %s with the not found page", async (path) => {
      getTabletGameMock.mockResolvedValue(LOBBY_7);
      renderAdminRoutes([path]);

      expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
    });
  });

  it("should replace the history entry of the redirected URL", async () => {
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    const router = renderAdminRoutes(["/statistics", "/settings/3"]);
    await expectPage("Settings /settings/7");

    await act(async () => {
      await router.navigate(-1);
    });

    await expectPage("Statistics /statistics");
  });

  it("should show a loading state while the tablet game request is pending", async () => {
    getTabletGameMock.mockReturnValue(new Promise(() => {}));
    renderAdminRoutes(["/settings/3"]);

    expect(await screen.findByRole("status", { name: "Loading page" })).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("should show an error with Retry and redirect nowhere when the request fails", async () => {
    getTabletGameMock.mockRejectedValue(new Error("network down"));
    const router = renderAdminRoutes(["/game/3"]);

    expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Game/ })).toBeNull();
    expect(router.state.location.pathname).toBe("/game/3");
  });

  it("should not let the admin layout retry a failed read on its own", async () => {
    getTabletGameMock.mockRejectedValueOnce(new Error("network down"));
    getTabletGameMock.mockRejectedValueOnce(new Error("network down"));
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    const router = renderAdminRoutes(["/game/3"]);
    expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();

    await act(async () => {
      await router.navigate("/settings/3");
    });

    expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Settings/ })).toBeNull();
    expect(getTabletGameMock).toHaveBeenCalledTimes(2);
  });

  it("should follow the tablet game once Retry succeeds", async () => {
    getTabletGameMock.mockRejectedValueOnce(new Error("network down"));
    getTabletGameMock.mockResolvedValue(STARTED_7);
    renderAdminRoutes(["/game/3"]);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await expectPage("Game /game/7");
  });
});

describe("a navigation that replaces a pending one", () => {
  it("should read the tablet game again instead of reusing the replaced read", async () => {
    getTabletGameMock.mockResolvedValueOnce(NO_TABLET_GAME);
    const router = renderAdminRoutes(["/statistics"]);
    await expectPage("Statistics /statistics");

    let answerReplacedRead!: (body: TabletGameResponse) => void;
    getTabletGameMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answerReplacedRead = resolve;
      }),
    );
    getTabletGameMock.mockResolvedValue(STARTED_7);

    await act(async () => {
      void router.navigate("/game/3");
      await vi.waitFor(() => expect(getTabletGameMock).toHaveBeenCalledTimes(2));
    });
    act(() => {
      void router.navigate("/game/7");
    });
    // The replaced read answers late, with the state from before game 7 started.
    act(() => {
      answerReplacedRead(LOBBY_7);
    });

    await expectPage("Game /game/7");
    expect(router.state.location.pathname).toBe("/game/7");
  });
});

// Issue #203: Settings wrote the URL id into the current game and broke the Game tab.
describe("navigation after a hand-typed settings URL", () => {
  it("should keep the current game and lead the Game tab to the tablet game", async () => {
    setCurrentGameId(7);
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    renderAdminRoutes(["/settings/5"]);
    await expectPage("Settings /settings/7");

    fireEvent.click(screen.getByRole("link", { name: "Game" }));

    await expectPage("Start /start/7");
    expect($currentGameId.get()).toBe(7);
  });

  it("should point the Game tab at the started tablet game", async () => {
    getTabletGameMock.mockResolvedValue(STARTED_7);
    renderAdminRoutes(["/settings/5"]);
    await expectPage("Settings /settings/7");

    expect(screen.getByRole("link", { name: "Game" }).getAttribute("href")).toBe("/game/7");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings/7");
  });
});

describe("nav links after the tablet game changed outside the admin layout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should read the tablet game again when the layout comes back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    getTabletGameMock.mockResolvedValue(STARTED_7);
    const router = renderAdminRoutes(["/statistics"]);
    await expectPage("Statistics /statistics");
    await vi.waitFor(() => {
      expect(screen.getByRole("link", { name: "Game" }).getAttribute("href")).toBe("/game/7");
    });

    await act(async () => {
      await router.navigate("/summary/7");
    });
    await expectPage("Summary /summary/7");
    getTabletGameMock.mockResolvedValue(NO_TABLET_GAME);
    vi.setSystemTime(Date.now() + 60_000);
    await act(async () => {
      await router.navigate("/statistics");
    });

    await expectPage("Statistics /statistics");
    await vi.waitFor(() => {
      expect(screen.getByRole("link", { name: "Game" }).getAttribute("href")).toBe("/start");
    });
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });

  it("should not read the tablet game twice when a route loader has just read it", async () => {
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    const router = renderAdminRoutes(["/game/3"]);
    await expectPage("Start /start/7");
    getTabletGameMock.mockClear();

    await act(async () => {
      await router.navigate("/summary/7");
    });
    await act(async () => {
      await router.navigate("/settings/7");
    });

    await expectPage("Settings /settings/7");
    expect(getTabletGameMock).toHaveBeenCalledTimes(1);
  });
});

describe("room state on the start page", () => {
  it("should drop an invitation for a game the tablet no longer has", async () => {
    setInvitation({ gameId: 5, invitationLink: "/invite/5" });
    getTabletGameMock.mockResolvedValue(NO_TABLET_GAME);
    renderAdminRoutes(["/start"]);

    await expectPage("Start /start");
    expect($invitation.get()).toBeNull();
    expect($currentGameId.get()).toBeNull();
  });

  it("should keep the invitation of the tablet game", async () => {
    setInvitation({ gameId: 7, invitationLink: "/invite/7" });
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    renderAdminRoutes(["/start/7"]);

    await expectPage("Start /start/7");
    expect($invitation.get()).toEqual({ gameId: 7, invitationLink: "/invite/7" });
  });
});

describe("redirects to the tablet game", () => {
  it("should read the tablet game once for a redirect and its target route", async () => {
    getTabletGameMock.mockResolvedValue(LOBBY_7);
    renderAdminRoutes(["/settings/5"]);

    await expectPage("Settings /settings/7");
    expect(getTabletGameMock).toHaveBeenCalledTimes(1);
  });

  it("should read the tablet game once when /start redirects to the started game", async () => {
    getTabletGameMock.mockResolvedValue(STARTED_7);
    renderAdminRoutes(["/start/3"]);

    await expectPage("Game /game/7");
    expect(getTabletGameMock).toHaveBeenCalledTimes(1);
  });
});
