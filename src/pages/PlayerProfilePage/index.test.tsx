// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/shared/api/player", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/player")>()),
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

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { logout, type AuthenticatedUser } from "@/shared/api/auth";
import { NetworkError } from "@/shared/api";
import { getPlayerProfile, type PlayerProfileResponse } from "@/shared/api/player";
import {
  BOARD_FIELDS,
  buildHitDistribution,
  buildPlayerProfile,
  buildPlayerProfileGame,
  buildPlayerProfileStats,
} from "@/shared/types/player.test-support";
import { ROUTES } from "@/lib/router/routes";
import { createQueryClient } from "@/shared/query/queryClient";
import PlayerProfilePage from ".";
import { toHitDots, type HitDot } from "@/shared/ui/profile-statistics/hitDots";
import { BOARD_ORDER } from "@/shared/ui/profile-statistics/boardFieldSpot";

type Router = ReturnType<typeof createMemoryRouter>;

function renderPage(search = ""): Router {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, element: <p>Login form</p> },
      { path: ROUTES.joined, element: <p>Waiting room</p> },
      { path: ROUTES.playerProfile, element: <PlayerProfilePage /> },
      { path: ROUTES.publicProfilePattern, element: <p>Public profile</p> },
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

/** The decorative images in the card's identity block: the avatar or its fallback icon. */
function avatarImages(): HTMLElement[] {
  const card = screen.getByRole("region", { name: "Player stats" });
  const name = within(card).getByRole("heading", { level: 2 });
  return within(card)
    .getAllByRole("presentation")
    .filter((image) => image.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function avatarSources(): Array<string | null> {
  return avatarImages().map((image) => image.getAttribute("src"));
}

function block(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

/** The hit dots, one per hit in the order of `toHitDots`, in a group assistive technology skips. */
function hitDots(): Element[] {
  return Array.from(
    block("Hit distribution").querySelectorAll('svg g[aria-hidden="true"] > circle'),
  );
}

/** The board fields filled with blue, in board order, when the board has too many hits for dots. */
function heatFields(): Element[] {
  return Array.from(block("Hit distribution").querySelectorAll("svg [data-field]"));
}

/** Identify fields from rendered coordinates, independently of the dot generator's order. */
function dotsInField(field: HitDot["field"]): Element[] {
  return hitDots().filter((dot) => {
    const x = Number(dot.getAttribute("cx"));
    const y = Number(dot.getAttribute("cy"));
    const radius = Math.hypot(x, y);
    if (field === "BULLSEYE") return radius < 6.4;
    if (field === "BULL") return radius >= 6.4 && radius < 16;
    const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 369) % 360;
    const segment = BOARD_ORDER[Math.floor(angle / 18)];
    const ring = radius >= 162 && radius <= 170 ? "D" : radius >= 99 && radius <= 107 ? "T" : "S";
    return radius >= 16 && radius <= 170 && `${ring}${segment}` === field;
  });
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
    // jsdom lacks DOMMatrixReadOnly; the sector card's positioner reads a translate from it.
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        m41 = 0;
        m42 = 0;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("shows the player's avatar in the stats card circle", () => {
    renderPage();

    expect(avatarSources()).toEqual(["/api/player/42/avatar"]);
  });

  it("shows the user icon in the circle when the avatar fails to load", () => {
    renderPage();
    const [avatar] = avatarImages();
    if (avatar === undefined) throw new Error("avatar image missing");
    expect(avatar.getAttribute("src")).toBe("/api/player/42/avatar");

    fireEvent.error(avatar);

    expect(avatarSources()).toEqual(["user-blue.svg"]);
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

  it("links another registered player's name in History to their Public profile", async () => {
    const router = renderPage("?tab=history");

    const history = await screen.findByRole("list", { name: "Recent games" });
    const links = within(history).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["1. Anna", ROUTES.publicProfile(7)],
    ]);

    fireEvent.click(screen.getByRole("link", { name: "1. Anna" }));

    expect(await screen.findByText("Public profile")).toBeTruthy();
    expect(router.state.location.pathname).toBe(ROUTES.publicProfile(7));
  });

  it("keeps the player's own name and a guest in History as plain text", async () => {
    renderPage("?tab=history");

    const history = await screen.findByRole("list", { name: "Recent games" });
    for (const label of ["2. Alice (you)", "1. Alice (you)", "2. Guest"]) {
      const [entry] = within(history).getAllByText(label);
      expect(entry?.tagName).toBe("LI");
      expect(entry?.querySelector("a")).toBeNull();
    }
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
    expect(screen.getByRole("group", { name: "Dartboard heatmap of all games" })).toBeTruthy();
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
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
            field,
            hits: field === "BULL" ? 10 : 0,
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
    expect(hitDots()).toHaveLength(10);
  });

  it("draws a dot for each hit and none for a board field without hits", async () => {
    const hits: Record<string, number> = { T20: 40, D16: 30, T19: 20, S5: 10 };
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
            field,
            hits: hits[field] ?? 0,
          })),
          mostHitSegment: { segment: "20", hits: 40, share: 40 },
        }),
      }),
    );

    renderPage();

    expect(
      await screen.findByRole("group", { name: "Dartboard heatmap of all games" }),
    ).toBeTruthy();
    expect(hitDots()).toHaveLength(100);
    for (const field of BOARD_FIELDS) {
      expect(dotsInField(field), field).toHaveLength(hits[field] ?? 0);
    }
    expect(block("Hit distribution").querySelectorAll("[filter]")).toHaveLength(0);
  });

  it("draws each treble and double hit as a dot inside its own ring", async () => {
    // Different counts per ring, so trebles drawn on the double ring would show.
    const hitDistribution = buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
      field,
      hits: field.startsWith("T") ? 2 : field.startsWith("D") ? 3 : 0,
    }));
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({ stats: buildPlayerProfileStats({ hitDistribution }) }),
    );

    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });

    // Treble ring 99 to 107 mm, double ring 162 to 170 mm from the centre.
    const inRing = (dot: Element, [inner, outer]: [number, number]): boolean => {
      const radius = Math.hypot(Number(dot.getAttribute("cx")), Number(dot.getAttribute("cy")));
      // The dot's centre keeps 2.3 mm from the ring's edges; the drawn dot may reach past them.
      const edge = 2.3;
      return radius - edge >= inner - 1e-9 && radius + edge <= outer + 1e-9;
    };

    // 20 trebles with 2 hits each and 20 doubles with 3.
    expect(hitDots()).toHaveLength(100);
    expect(hitDots().filter((dot) => inRing(dot, [99, 107]))).toHaveLength(40);
    expect(hitDots().filter((dot) => inRing(dot, [162, 170]))).toHaveLength(60);
    // Each dot sits where the position function put it, so no swapped or mirrored axis.
    expect(
      hitDots().map((dot) => [Number(dot.getAttribute("cx")), Number(dot.getAttribute("cy"))]),
    ).toEqual(toHitDots(hitDistribution).map(({ x, y }) => [x, y]));
  });

  it("fills each hit board field instead of drawing dots past 150 hits", async () => {
    // 161 hits: past the 150 a board draws as dots.
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          hitDistribution: buildHitDistribution({ T20: 100, S5: 40, D16: 20, BULLSEYE: 1 }),
        }),
      }),
    );

    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });

    expect(hitDots()).toHaveLength(0);
    expect(heatFields().map((field) => field.getAttribute("data-field"))).toEqual([
      "T20",
      "D16",
      "S5",
      "S5",
      "BULLSEYE",
    ]);
    // The fill follows the step: T20 is Very high, S5 Medium, D16 Low.
    const classOf = (field: string): string | null =>
      heatFields()
        .find((element) => element.getAttribute("data-field") === field)
        ?.getAttribute("class") ?? null;
    expect(classOf("T20")).not.toBe(classOf("S5"));
    expect(classOf("S5")).not.toBe(classOf("D16"));
    // The board keeps all 82 of its own fields under the blue layers: 4 per segment and the
    // two centre fields, so the board still reads as a dartboard.
    const boardPaths = screen
      .getByRole("group", { name: "Dartboard heatmap of all games" })
      .querySelectorAll("path:not([data-field])");
    expect(boardPaths).toHaveLength(82);
    // ...each in its own colour: dark and light singles, red and green rings.
    const colours = new Set(Array.from(boardPaths, (path) => path.getAttribute("class")));
    expect(colours.size).toBeGreaterThanOrEqual(4);
  });

  it("draws dots again for a board with 150 hits", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          hitDistribution: buildHitDistribution({ T20: 100, S5: 50 }),
        }),
      }),
    );

    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });

    expect(hitDots()).toHaveLength(150);
    expect(heatFields()).toHaveLength(0);
  });

  it("lists the five most hit fields, ties in board order, with bars relative to the leader", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          hitDistribution: buildHitDistribution({
            S20: 48,
            T20: 26,
            D20: 12,
            BULL: 12,
            BULLSEYE: 24,
            S1: 12,
            S5: 3,
          }),
        }),
      }),
    );

    renderPage();
    const panel = await screen.findByRole("region", { name: "Most hit fields" });

    const rows = within(panel).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "S2048 hits",
      "T2026 hits",
      "Bullseye24 hits",
      "S112 hits",
      "D2012 hits",
    ]);
    expect(
      rows.map((row) => row.querySelector<HTMLElement>('[aria-hidden="true"] > span')?.style.width),
    ).toEqual(["100%", "54.17%", "50%", "25%", "25%"]);
  });

  it("switches the board and the most hit fields to the games of one out rule", async () => {
    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });
    expect(hitDots()).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Games in the hit distribution: All games" }),
    );
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toEqual([
      "All games",
      "Single-Out",
      "Double-Out",
      "Triple-Out",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Double-Out" }));

    expect(
      await screen.findByRole("group", { name: "Dartboard heatmap of Double-Out games" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Games in the hit distribution: Double-Out" }),
    ).toBeTruthy();
    // Double out holds 60 T20 hits and nothing else: dots, and one row.
    expect(hitDots()).toHaveLength(60);
    expect(
      within(block("Most hit fields"))
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["T2060 hits"]);
    // The out rule filter leaves the other blocks on all games.
    expect(block("Most hit segment").textContent).toContain("7% of all throws");
  });

  it("keeps an out rule without games selectable, with an empty board", async () => {
    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });

    fireEvent.click(
      screen.getByRole("button", { name: "Games in the hit distribution: All games" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Triple-Out" }));

    expect(
      await screen.findByRole("group", { name: "Dartboard heatmap of Triple-Out games" }),
    ).toBeTruthy();
    expect(hitDots()).toHaveLength(0);
    expect(heatFields()).toHaveLength(0);
    expect(within(block("Most hit fields")).getByText("No hits yet")).toBeTruthy();
  });

  it("opens a sector's card on click, with the hits of the selected games", async () => {
    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });

    const sector = screen.getByRole("button", { name: "Sector 20" });
    fireEvent.click(sector);

    const card = await screen.findByRole("dialog", { name: "Sector 20" });
    expect(card.textContent).toBe("Sector 20120 hitsSingle 20: 12Double 20: 12Triple 20: 96");

    // A second click on the same sector closes the card.
    fireEvent.click(sector);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(
      screen.getByRole("button", { name: "Games in the hit distribution: All games" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Double-Out" }));
    await screen.findByRole("group", { name: "Dartboard heatmap of Double-Out games" });
    fireEvent.click(screen.getByRole("button", { name: "Sector 20" }));

    expect((await screen.findByRole("dialog", { name: "Sector 20" })).textContent).toBe(
      "Sector 2060 hitsSingle 20: 0Double 20: 0Triple 20: 60",
    );
  });

  it("opens the centre's card with Bull and Bullseye, and closes it on Escape back to the sector", async () => {
    vi.mocked(getPlayerProfile).mockResolvedValue(
      buildProfile({
        stats: buildPlayerProfileStats({
          hitDistribution: buildHitDistribution({ BULL: 5, BULLSEYE: 2, T20: 3 }),
        }),
      }),
    );

    renderPage();
    await screen.findByRole("group", { name: "Dartboard heatmap of all games" });
    fireEvent.click(screen.getByRole("button", { name: "Bull" }));

    const card = await screen.findByRole("dialog", { name: "Bull" });
    expect(card.textContent).toBe("Bull7 hitsBull: 5Bullseye: 2");

    fireEvent.keyDown(card, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Focus goes back to the sector that opened the card.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bull" })),
    );
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
          hitDistribution: buildPlayerProfileStats().hitDistribution.map(({ field }) => ({
            field,
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
    expect(screen.getByRole("group", { name: "Dartboard heatmap of all games" })).toBeTruthy();
    expect(hitDots()).toHaveLength(0);
    expect(within(block("Most hit fields")).getByText("No hits yet")).toBeTruthy();
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
      new Set([
        "/api/player/42/avatar",
        "gamepad.svg",
        "trophy.svg",
        "bar-chart.svg",
        "target.svg",
      ]),
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
