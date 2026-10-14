// @vitest-environment jsdom

// ── API mock (only external boundary) ────────────────────────────────────────
const getGamesOverviewMock = vi.fn();

vi.mock("@/shared/api/statistics", () => ({
  getGamesOverview: (...args: unknown[]) => getGamesOverviewMock(...args),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/shared/query/queryClient";
import { buildFinishedGame } from "@/shared/types/game.test-support";
import styles from "./GamesOverview.module.css";
import GamesOverviewPage from "./GamesOverview";
import { gamesOverviewLoader } from "./useGamesOverview";

const GAMES = [
  buildFinishedGame({
    id: 1,
    winnerRounds: 12,
    winnerName: "Alice",
    playersCount: 4,
    date: "2024-01-15T00:00:00Z",
  }),
  buildFinishedGame({
    id: 2,
    winnerRounds: 8,
    winnerName: "Bob",
    playersCount: 3,
    date: "2024-01-10T00:00:00Z",
  }),
];

function renderPage(path = "/games"): ReturnType<typeof render> {
  const router = createMemoryRouter(
    [
      {
        path: "/games",
        element: <GamesOverviewPage />,
        loader: gamesOverviewLoader,
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("GamesOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should render loading indicator during pagination navigation", async () => {
    getGamesOverviewMock.mockResolvedValueOnce({ items: GAMES, total: 20 });
    renderPage();
    await screen.findByText("Alice");

    getGamesOverviewMock.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole("link", { name: /go to next page/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeTruthy();
    });
  });

  it("should render game cards when data loads successfully", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("should render error message when API request fails", async () => {
    getGamesOverviewMock.mockRejectedValue(new Error("Network error"));
    renderPage();

    expect(await screen.findByText("Could not load games overview")).toBeTruthy();
  });

  it("should render retry button when API request fails", async () => {
    getGamesOverviewMock.mockRejectedValue(new Error("Network error"));
    renderPage();

    expect(await screen.findByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("should refetch without a route reload when retry is clicked", async () => {
    getGamesOverviewMock.mockRejectedValueOnce(new Error("Network error"));
    renderPage();

    getGamesOverviewMock.mockResolvedValueOnce({ items: GAMES, total: 2 });
    fireEvent.click(await screen.findByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Alice")).toBeTruthy();
    expect(getGamesOverviewMock).toHaveBeenCalledTimes(2);
  });

  it("should render empty state message when games list is empty and no error", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [], total: 0 });
    renderPage();

    expect(await screen.findByText(/no games/i)).toBeTruthy();
  });

  it("should not show error or loading state when data is present", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });
    renderPage();

    await screen.findByText("Alice");

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("should render game date, players count, winner name and rounds when games load", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [GAMES[0]], total: 1 });
    renderPage();

    await screen.findByText("Alice");

    expect(screen.getByText("4")).toBeTruthy(); // playersCount
    expect(screen.getByText("12")).toBeTruthy(); // winnerRounds
  });

  it("should render game stats with CSS module classes instead of global class strings when games load", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: [GAMES[0]], total: 1 });
    renderPage();

    await screen.findByText("Alice");

    const playersValue = screen.getByText("4");
    const playersLabel = playersValue.parentElement;

    expect(playersLabel?.className).toContain(styles.statLabel);
    expect(playersLabel?.className).not.toBe("stat-label");
    expect(playersValue.className).toContain(styles.statValue);
    expect(playersValue.className).not.toBe("stat-value");
  });

  it("should render an explicit error state when game data is incomplete", async () => {
    getGamesOverviewMock.mockResolvedValue({
      items: [{ id: 3, winnerRounds: 4, winnerName: null, playersCount: 2, date: null }],
      total: 1,
    });
    renderPage();

    expect(await screen.findByText("Could not load games overview")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /details/i })).toBeNull();
    expect(screen.queryByText("Unknown")).toBeNull();
    expect(screen.queryByText("Unknown date")).toBeNull();
  });

  it("should render detail link for each game card when games load", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 2 });
    renderPage();

    await screen.findByText("Alice");

    const links = screen.getAllByRole("link", { name: /details/i });
    expect(links).toHaveLength(2);
  });

  it("should display pagination with correct page info when enough games exist", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 27 });
    renderPage();

    // Page 1 of 3 (27 items, limit=9)
    expect(await screen.findByText(/page 1 of/i)).toBeTruthy();
  });

  it("should show the first page and page forward from it when the offset param is invalid", async () => {
    getGamesOverviewMock.mockResolvedValue({ items: GAMES, total: 27 });
    renderPage("/games?offset=abc");

    expect(await screen.findByText(/page 1 of 3/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /go to next page/i }));

    await waitFor(() => {
      expect(getGamesOverviewMock).toHaveBeenLastCalledWith(9, 9, expect.any(AbortSignal));
    });
  });
});
