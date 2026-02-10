// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import styles from "./GameSummaryPage.module.css";
import GameSummaryPage from "./GameSummaryPage";

vi.mock("../hooks/useGameSummaryPage", () => ({
  useGameSummaryPage: () => ({
    error: null,
    podiumData: [],
    newList: [],
    leaderBoardList: [],
    handleUndo: vi.fn(),
    handlePlayAgain: vi.fn(),
    handleBackToStart: vi.fn(),
  }),
}));

vi.mock("@nanostores/react", () => ({
  useStore: () => ({ startScore: 301 }),
}));

vi.mock("@/components/overview-player-item/OverviewPlayerItemList", () => ({
  default: () => <div data-testid="leaderboard-list" />,
}));

vi.mock("@/components/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

vi.mock("@/shared/ui/confetti", () => ({
  Confetti: () => null,
}));

describe("GameSummaryPage", () => {
  it("renders summary action buttons in a shared actions container", () => {
    render(<GameSummaryPage />);

    const playAgainButton = screen.getByRole("button", { name: "Play Again" });
    const backToStartButton = screen.getByRole("button", { name: "Back To Start" });

    const actionsContainer = playAgainButton.closest(`.${styles.summaryActions}`);
    expect(actionsContainer).not.toBeNull();
    expect(backToStartButton.closest(`.${styles.summaryActions}`)).toBe(actionsContainer);
    expect(playAgainButton.closest(`.${styles.playAgainWrap}`)).not.toBeNull();
    expect(backToStartButton.closest(`.${styles.backToStartWrap}`)).not.toBeNull();
  });
});
