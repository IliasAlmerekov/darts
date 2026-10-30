// @vitest-environment jsdom

vi.mock("./useGameDetailPage", () => ({
  useGameDetailPage: () => useGameDetailPageMock(),
}));

vi.mock("@/shared/ui/navigation-bar", () => ({
  NavigationBar: () => <div data-testid="navigation-bar" />,
}));

vi.mock("@/shared/ui/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

vi.mock("@/shared/ui/overview-player-item", () => ({
  OverviewPlayerItemList: () => <div data-testid="leaderboard" />,
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/router/routes";
import GameDetailPage from "./GameDetailPage";
import styles from "./GameDetailPage.module.css";
import type { StandingsEntry } from "@/lib/game/finishedGameStandings";

const useGameDetailPageMock = vi.fn();

function buildEntry(overrides: Partial<StandingsEntry> = {}): StandingsEntry {
  return { id: 1, name: "Alice", rounds: 1, threeDartAverage: "60.00", ...overrides };
}

describe("GameDetailPage", () => {
  beforeEach(() => {
    useGameDetailPageMock.mockReset();
  });

  it("should render game details when hook returns data", () => {
    useGameDetailPageMock.mockReturnValue({
      podiumData: [buildEntry()],
      leaderBoardList: [],
    });

    render(
      <MemoryRouter>
        <GameDetailPage />
      </MemoryRouter>,
    );

    const backLink = screen.getByRole("link", { name: "Back" });
    const leaderboard = screen.getByTestId("leaderboard");

    expect(screen.getByRole("heading", { name: "Game details" })).toBeTruthy();
    expect(backLink.getAttribute("href")).toBe(ROUTES.gamesOverview);
    expect(screen.queryByTestId("podium")).not.toBeNull();
    expect(leaderboard).not.toBeNull();
    expect(leaderboard.parentElement?.className).toContain(styles.playerboardList);
  });
});
