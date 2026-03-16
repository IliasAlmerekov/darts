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
import type { WinnerPlayerProps } from "@/types";

const useGameDetailPageMock = vi.fn();

function buildPlayer(overrides: Partial<WinnerPlayerProps> = {}): WinnerPlayerProps {
  return {
    id: 1,
    name: "Alice",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [{}],
    ...overrides,
  };
}

describe("GameDetailPage", () => {
  beforeEach(() => {
    useGameDetailPageMock.mockReset();
  });

  it("should render styled game details when hook returns data", () => {
    useGameDetailPageMock.mockReturnValue({
      error: null,
      podiumData: [buildPlayer()],
      newList: [buildPlayer()],
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

  it("should render an error message when hook reports failure", () => {
    useGameDetailPageMock.mockReturnValue({
      error: "Could not load finished game data",
      podiumData: [],
      newList: [],
      leaderBoardList: [],
    });

    render(
      <MemoryRouter>
        <GameDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Could not load finished game data")).toBeTruthy();
    expect(screen.queryByTestId("podium")).toBeNull();
  });
});
