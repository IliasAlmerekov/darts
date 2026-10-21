// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Dates show in the browser's time zone; the formatter reads it when the module loads.
vi.hoisted(() => {
  process.env.TZ = "UTC";
});

const useAuthenticatedUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/hooks/useAuthenticatedUser", () => ({
  useAuthenticatedUser: () => useAuthenticatedUserMock(),
}));

vi.mock("@/shared/api/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("@/shared/api/player", () => ({
  getPlayerProfile: vi.fn(),
}));

vi.mock("@/shared/services/browser/clientLogger", () => ({
  clientLogger: { error: vi.fn() },
}));

// Vite inlines small SVGs as data URLs; file names keep the icon assertions readable.
vi.mock("@/assets/icons/user-blue.svg", () => ({ default: "user-blue.svg" }));
vi.mock("@/assets/icons/gamepad.svg", () => ({ default: "gamepad.svg" }));
vi.mock("@/assets/icons/trophy.svg", () => ({ default: "trophy.svg" }));
vi.mock("@/assets/icons/bar-chart.svg", () => ({ default: "bar-chart.svg" }));
vi.mock("@/assets/icons/target.svg", () => ({ default: "target.svg" }));

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { logout, type AuthenticatedUser } from "@/shared/api/auth";
import { NetworkError } from "@/shared/api";
import { getPlayerProfile, type PlayerProfileResponse } from "@/shared/api/player";
import { buildPlayerProfile, buildPlayerProfileGame } from "@/shared/types/player.test-support";
import { ROUTES } from "@/lib/router/routes";
import { createQueryClient } from "@/shared/query/queryClient";
import PlayerProfilePage from ".";

type Router = ReturnType<typeof createMemoryRouter>;

function renderPage(search = ""): Router {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.joined, element: <p>Waiting room</p> },
      { path: ROUTES.playerProfile, element: <PlayerProfilePage /> },
    ],
    { initialEntries: [`${ROUTES.playerProfile}${search}`] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    success: true,
    id: 42,
    roles: ["ROLE_PLAYER"],
    email: "alice@example.com",
    username: "Alice",
    redirect: ROUTES.playerProfile,
    ...overrides,
  };
}

function buildProfile(overrides: Partial<PlayerProfileResponse> = {}): PlayerProfileResponse {
  return buildPlayerProfile({
    recentGames: [
      buildPlayerProfileGame(),
      buildPlayerProfileGame({
        gameId: 30,
        finishedAt: "2026-10-19T09:05:00+00:00",
        placement: 1,
        roundAverage: 60,
        participants: [
          { playerId: 42, displayName: "Alice", placement: 1, isSelf: true },
          { playerId: null, displayName: "Guest", placement: 2, isSelf: false },
        ],
      }),
    ],
    ...overrides,
  });
}

function statValue(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

function pointTitles(chart: HTMLElement): string[] {
  return Array.from(chart.querySelectorAll("circle > title")).map(
    (title) => title.textContent ?? "",
  );
}

const SAMPLE_BLOCKS = [
  "Hit distribution",
  "Favorite doubles",
  "Highest finish",
  "Most hit segment",
];

describe("PlayerProfilePage", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
    vi.mocked(getPlayerProfile).mockReset();
    vi.mocked(getPlayerProfile).mockResolvedValue(buildProfile());
    useAuthenticatedUserMock.mockReset();
    useAuthenticatedUserMock.mockReturnValue({ user: createUser(), loading: false, error: null });
  });

  it("shows the player's name and the stats from the profile request", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Player Profile" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeTruthy();
    expect(await within(statValue("Games played")).findByText("18")).toBeTruthy();
    expect(within(statValue("Avg. points")).getByText("56.40")).toBeTruthy();
  });

  it("falls back to the email when the user has no username", () => {
    useAuthenticatedUserMock.mockReturnValue({
      user: createUser({ username: null }),
      loading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByRole("heading", { level: 2, name: "alice@example.com" })).toBeTruthy();
  });

  it("shows a dash for the average when the player has no finished game", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({ stats: { gamesPlayed: 0, scoreAverage: null }, recentGames: [] }),
    );

    renderPage();

    expect(await within(statValue("Games played")).findByText("0")).toBeTruthy();
    expect(within(statValue("Avg. points")).getByText("–")).toBeTruthy();
  });

  it("lists each recent game in History with its participants", async () => {
    renderPage("?tab=history");

    const history = await screen.findByRole("list", { name: "Recent games" });
    const games = within(history)
      .getAllByRole("listitem")
      .filter((item) => item.parentElement === history);

    expect(games).toHaveLength(2);
    expect(
      within(games[0] as HTMLElement).getByText("20 Oct 2026, 18:42 · 2nd of 2 · Avg 45.3"),
    ).toBeTruthy();
    expect(
      within(games[0] as HTMLElement)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["1. Anna", "2. Alice (you)"]);
    expect(
      within(games[1] as HTMLElement).getByText("19 Oct 2026, 09:05 · 1st of 2 · Avg 60.0"),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Avg/ })).toBeNull();
  });

  it("tells a player without finished games so in History", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(buildProfile({ recentGames: [] }));

    renderPage("?tab=history");

    expect(await screen.findByText("No finished games yet.")).toBeTruthy();
  });

  it("plots one point per game, oldest first, on Overview and Performance", async () => {
    renderPage();

    const overviewChart = await screen.findByRole("img", { name: /^Scoring trend chart/ });
    expect(overviewChart.getAttribute("aria-label")).toBe(
      "Scoring trend chart, 2 games, round average from 60.0 to 45.3",
    );
    expect(pointTitles(overviewChart)).toEqual([
      "19 Oct 2026, 09:05 · Avg 60.0",
      "20 Oct 2026, 18:42 · Avg 45.3",
    ]);

    fireEvent.click(screen.getByRole("tab", { name: "Performance" }));

    const performance = screen.getByRole("tabpanel", { name: "Performance" });
    const performanceChart = within(performance).getByRole("img", { name: /^Scoring trend chart/ });
    expect(pointTitles(performanceChart)).toEqual([
      "19 Oct 2026, 09:05 · Avg 60.0",
      "20 Oct 2026, 18:42 · Avg 45.3",
    ]);
    const averages = within(performance).getByRole("list", { name: "Round average per game" });
    expect(
      within(averages)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["19 Oct 2026, 09:05 · Avg 60.0", "20 Oct 2026, 18:42 · Avg 45.3"]);
  });

  it("opens the tab named in the URL and falls back to Overview", () => {
    renderPage("?tab=history");
    expect(screen.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens Overview for an unknown tab", () => {
    renderPage("?tab=settings");
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "Overview" })).toBeTruthy();
  });

  it("writes the selected tab to the URL", () => {
    const router = renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(router.state.location.search).toBe("?tab=history");
    expect(screen.getByRole("tabpanel", { name: "History" })).toBeTruthy();
  });

  it("moves between tabs with the arrow keys", () => {
    const router = renderPage();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowLeft" });

    expect(router.state.location.search).toBe("?tab=history");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "History" }));
  });

  it("marks sample data and only sample data", async () => {
    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    for (const name of SAMPLE_BLOCKS) {
      expect(within(screen.getByRole("region", { name })).getByText("Sample data")).toBeTruthy();
    }
    for (const name of ["Won", "Checkout rate", "Member since"]) {
      expect(within(statValue(name)).getByText("Sample data")).toBeTruthy();
    }
    expect(within(statValue("Games played")).queryByText("Sample data")).toBeNull();
    expect(within(statValue("Avg. points")).queryByText("Sample data")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Scoring trend" })).queryByText("Sample data"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Performance" }));
    expect(
      within(screen.getByRole("tabpanel", { name: "Performance" })).queryByText("Sample data"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(
      within(screen.getByRole("tabpanel", { name: "History" })).queryByText("Sample data"),
    ).toBeNull();
  });

  it("lists the four stats as list items and keeps the tabs in the banner", async () => {
    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    const stats = within(screen.getByRole("region", { name: "Player stats" })).getByRole("list");
    expect(within(stats).getAllByRole("listitem")).toHaveLength(4);
    // The page header is a banner landmark; Testing Library also counts the block headers.
    const tabList = screen.getByRole("tablist", { name: "Profile sections" });
    expect(tabList.closest("header")?.closest("main")).toBeNull();
  });

  it("uses the profile icons in the card and the Overview blocks", async () => {
    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    const profileImages = [
      ...screen.getByRole("region", { name: "Player stats" }).querySelectorAll("img"),
      ...screen.getByRole("tabpanel", { name: "Overview" }).querySelectorAll("img"),
    ];
    expect(new Set(profileImages.map((image) => image.getAttribute("src")))).toEqual(
      new Set(["user-blue.svg", "gamepad.svg", "trophy.svg", "bar-chart.svg", "target.svg"]),
    );
  });

  it("shows Loading while the request is pending, with identity and Log out at once", () => {
    vi.mocked(getPlayerProfile).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(within(statValue("Games played")).getByText("Loading…")).toBeTruthy();
    expect(within(statValue("Avg. points")).getByText("Loading…")).toBeTruthy();
    const panel = screen.getByRole("tabpanel", { name: "Overview" });
    expect(within(panel).getByRole("status").textContent).toBe("Loading…");
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("shows one error with Retry when the request fails, and Retry asks again", async () => {
    vi.mocked(getPlayerProfile)
      .mockRejectedValueOnce(new NetworkError("Failed to fetch"))
      .mockResolvedValueOnce(buildProfile());

    renderPage();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await within(statValue("Games played")).findByText("18")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getPlayerProfile).toHaveBeenCalledTimes(2);
  });

  it("does not repeat the error title as the message for an unknown failure", async () => {
    vi.mocked(getPlayerProfile).mockRejectedValueOnce(new Error("boom"));

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", { name: "Could not load your profile" }),
    ).toBeTruthy();
    expect(within(alert).getByText("Something went wrong. Please try again.")).toBeTruthy();
  });

  it("asks for the profile again on every visit", async () => {
    const router = renderPage();
    await within(statValue("Games played")).findByText("18");

    await act(() => router.navigate(ROUTES.joined));
    await act(() => router.navigate(ROUTES.playerProfile));

    expect(await within(statValue("Games played")).findByText("18")).toBeTruthy();
    expect(getPlayerProfile).toHaveBeenCalledTimes(2);
  });

  it("opens the login page when the player logs out", async () => {
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("keeps the profile with an error and logs out on Retry when logout fails", async () => {
    vi.mocked(logout)
      .mockRejectedValueOnce(new NetworkError("Failed to fetch"))
      .mockResolvedValueOnce(undefined);
    renderPage();
    await within(statValue("Games played")).findByText("18");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Player Profile" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Login form")).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
