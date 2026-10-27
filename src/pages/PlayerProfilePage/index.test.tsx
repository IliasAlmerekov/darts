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
import {
  buildPlayerProfile,
  buildPlayerProfileGame,
  buildPlayerProfileStats,
} from "@/shared/types/player.test-support";
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

function block(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

/** The heat spots drawn on the board, one per spot above Very low. */
function heatSpots(): Element[] {
  return Array.from(block("Hit distribution").querySelectorAll("circle[filter]"));
}

describe("PlayerProfilePage", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
    vi.mocked(getPlayerProfile).mockReset();
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({ registeredAt: "2026-02-14T00:00:00+02:00" }),
    );
    useAuthenticatedUserMock.mockReset();
    useAuthenticatedUserMock.mockReturnValue({ user: createUser(), loading: false, error: null });
  });

  it("shows the player's name and the stats from the profile request", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Player Profile" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeTruthy();
    expect(await within(statValue("Games played")).findByText("18")).toBeTruthy();
    expect(within(statValue("three-dart average")).getByText("56.40")).toBeTruthy();
  });

  it("shows the three-dart average of 60.6 as 60.60 labelled Ø AVG", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({ stats: buildPlayerProfileStats({ scoreAverage: 60.6 }) }),
    );

    renderPage();

    const average = statValue("three-dart average");
    expect(await within(average).findByText("60.60")).toBeTruthy();
    expect(average.textContent).toBe("Ø AVG60.60");
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
      buildProfile({
        stats: buildPlayerProfileStats({ gamesPlayed: 0, scoreAverage: null }),
        recentGames: [],
      }),
    );

    renderPage();

    expect(await within(statValue("Games played")).findByText("0")).toBeTruthy();
    expect(within(statValue("three-dart average")).getByText("–")).toBeTruthy();
  });

  it("lists each recent game in History with its participants", async () => {
    renderPage("?tab=history");

    const history = await screen.findByRole("list", { name: "Recent games" });
    const games = within(history)
      .getAllByRole("listitem")
      .filter((item) => item.parentElement === history);

    expect(games).toHaveLength(2);
    expect(within(games[0] as HTMLElement).getByRole("paragraph").textContent).toBe(
      "20 Oct 2026, 18:42 · 2nd of 2 · Ø AVG 45.25",
    );
    expect(
      within(games[0] as HTMLElement).getByRole("group", { name: "three-dart average" })
        .textContent,
    ).toBe("Ø AVG 45.25");
    expect(
      within(games[0] as HTMLElement)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["1. Anna", "2. Alice (you)"]);
    expect(within(games[1] as HTMLElement).getByRole("paragraph").textContent).toBe(
      "19 Oct 2026, 09:05 · 1st of 2 · Ø AVG 60.00",
    );
    expect(screen.queryByRole("link", { name: /AVG/ })).toBeNull();
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
      "Scoring trend chart, 2 games, three-dart average from 60.00 to 45.25",
    );
    expect(pointTitles(overviewChart)).toEqual([
      "19 Oct 2026, 09:05 · Ø AVG 60.00",
      "20 Oct 2026, 18:42 · Ø AVG 45.25",
    ]);

    fireEvent.click(screen.getByRole("tab", { name: "Performance" }));

    const performance = screen.getByRole("tabpanel", { name: "Performance" });
    const performanceChart = within(performance).getByRole("img", { name: /^Scoring trend chart/ });
    expect(pointTitles(performanceChart)).toEqual([
      "19 Oct 2026, 09:05 · Ø AVG 60.00",
      "20 Oct 2026, 18:42 · Ø AVG 45.25",
    ]);
    const averages = within(performance).getByRole("list", { name: "Three-dart average per game" });
    const items = within(averages).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "19 Oct 2026, 09:05 · Ø AVG 60.00",
      "20 Oct 2026, 18:42 · Ø AVG 45.25",
    ]);
    expect(
      items.map(
        (item) => within(item).getByRole("group", { name: "three-dart average" }).textContent,
      ),
    ).toEqual(["Ø AVG 60.00", "Ø AVG 45.25"]);
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

  it("shows the throw statistics from the profile request, with no sample data", async () => {
    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    expect(statValue("Won").textContent).toBe("Won739% win rate");
    expect(statValue("Checkout rate").textContent).toBe("Checkout rate32%7 / 22 checkouts");
    expect(block("Favorite doubles").textContent).toBe("Favorite doubles1D1636%4 / 11");
    expect(block("Highest finish").textContent).toBe(
      "Highest finish121in 3 dartsT20 • S11 • Bullseye",
    );
    expect(block("Most hit segment").textContent).toBe(
      "Most hit segment207% of all throwsYou hit segment 20 more than any other segment.",
    );
    expect(screen.getByRole("img", { name: "Dartboard heatmap, most hits on 20" })).toBeTruthy();
    // 20 is Very high, the centre spot's 24 hits Low, and every other segment Very low.
    expect(heatSpots()).toHaveLength(2);
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(screen.queryByText("Consistent finisher")).toBeNull();
  });

  it("shows the values of another profile, with Bull and a one-dart finish", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          wins: 3,
          winRate: 12.5,
          checkoutRate: 38.2,
          checkoutHits: 21,
          checkoutAttempts: 55,
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ segment }) => ({
            segment,
            hits: segment === "BULL" ? 10 : 0,
          })),
          mostHitSegment: { segment: "BULL", hits: 10, share: 4.6 },
          favoriteDoubles: [
            { double: "BULLSEYE", hits: 2, attempts: 5, hitRate: 40 },
            { double: "D20", hits: 1, attempts: 7, hitRate: 14.3 },
          ],
          highestFinish: { score: 50, darts: 1, throws: ["BULLSEYE"] },
        }),
      }),
    );

    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    expect(statValue("Won").textContent).toBe("Won313% win rate");
    expect(statValue("Checkout rate").textContent).toBe("Checkout rate38%21 / 55 checkouts");
    expect(block("Favorite doubles").textContent).toBe(
      "Favorite doubles1Bullseye40%2 / 52D2014%1 / 7",
    );
    expect(block("Highest finish").textContent).toBe("Highest finish50in 1 dartBullseye");
    expect(block("Most hit segment").textContent).toBe(
      "Most hit segmentBull5% of all throwsYou hit Bull more than any other segment.",
    );
    expect(screen.getByRole("img", { name: "Dartboard heatmap, most hits on Bull" })).toBeTruthy();
    expect(heatSpots()).toHaveLength(1);
  });

  it("shows a dash for missing rates and one line for each empty block", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          wins: 0,
          winRate: null,
          checkoutRate: null,
          checkoutHits: 0,
          checkoutAttempts: 0,
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ segment }) => ({
            segment,
            hits: 0,
          })),
          mostHitSegment: null,
          favoriteDoubles: [],
          highestFinish: null,
        }),
      }),
    );

    renderPage();
    await screen.findByRole("img", { name: /^Scoring trend chart/ });

    expect(statValue("Won").textContent).toBe("Won0– win rate");
    expect(statValue("Checkout rate").textContent).toBe("Checkout rate–0 / 0 checkouts");
    expect(block("Favorite doubles").textContent).toBe(
      "Favorite doublesNo double-out checkouts yet",
    );
    expect(block("Highest finish").textContent).toBe("Highest finishNo finish yet");
    expect(block("Most hit segment").textContent).toBe("Most hit segmentNo hits yet");
    expect(screen.getByRole("img", { name: "Dartboard heatmap" })).toBeTruthy();
    expect(heatSpots()).toHaveLength(0);
  });

  it("shows the month the player registered", async () => {
    renderPage();

    expect((await screen.findByRole("group", { name: "Member since" })).textContent).toBe(
      "Member since Feb 2026",
    );
  });

  it.each([null, "not a date"])(
    "shows no Member since line for registeredAt %s",
    async (registeredAt) => {
      vi.mocked(getPlayerProfile).mockResolvedValue(buildProfile({ registeredAt }));

      renderPage();

      await within(statValue("Games played")).findByText("18");
      expect(screen.queryByRole("group", { name: "Member since" })).toBeNull();
    },
  );

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
    expect(within(statValue("three-dart average")).getByText("Loading…")).toBeTruthy();
    expect(statValue("Won").textContent).toBe("WonLoading…");
    expect(statValue("Checkout rate").textContent).toBe("Checkout rateLoading…");
    const panel = screen.getByRole("tabpanel", { name: "Overview" });
    expect(within(panel).getByRole("status").textContent).toBe("Loading…");
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Member since" })).toBeNull();
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
    expect(screen.queryByRole("group", { name: "Member since" })).toBeNull();
    expect(statValue("Won").textContent).toBe("Won–");
    expect(statValue("Checkout rate").textContent).toBe("Checkout rate–");

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
