// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameDetailPage from "./GameDetailPage";

const useGameDetailPageMock = vi.fn();

vi.mock("../hooks/useGameDetailPage", () => ({
  useGameDetailPage: () => useGameDetailPageMock(),
}));

vi.mock("@/components/navigation-bar/NavigationBar", () => ({
  default: () => <div data-testid="navigation-bar" />,
}));

vi.mock("@/components/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

vi.mock("@/components/overview-player-item/OverviewPlayerItemList", () => ({
  default: () => <div data-testid="leaderboard" />,
}));

describe("GameDetailPage", () => {
  beforeEach(() => {
    useGameDetailPageMock.mockReset();
  });

  it("renders finished game details from hook data", () => {
    useGameDetailPageMock.mockReturnValue({
      error: null,
      podiumData: [
        {
          id: 1,
          name: "Alice",
          score: 0,
          isActive: false,
          index: 0,
          rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
        },
      ],
      newList: [
        {
          id: 1,
          name: "Alice",
          score: 0,
          isActive: false,
          index: 0,
          rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
        },
      ],
      leaderBoardList: [],
    });

    render(
      <MemoryRouter>
        <GameDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Game details" })).toBeTruthy();
    expect(screen.queryByTestId("podium")).not.toBeNull();
    expect(screen.queryByTestId("leaderboard")).not.toBeNull();
  });

  it("renders error message when hook reports failure", () => {
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
