// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import styles from "./GameSummaryPage.module.css";
import type { WinnerPlayerProps } from "@/types";
import GameSummaryPage from ".";

type GameSummaryHookMockResult = {
  error: string | null;
  starting: boolean;
  podiumData: WinnerPlayerProps[];
  newList: WinnerPlayerProps[];
  leaderBoardList: WinnerPlayerProps[];
  loadSummary: () => void;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
};

const buildSummaryHookMockResult = (
  overrides: Partial<GameSummaryHookMockResult> = {},
): GameSummaryHookMockResult => ({
  error: null,
  starting: false,
  podiumData: [],
  newList: [],
  leaderBoardList: [],
  loadSummary: vi.fn(),
  handleUndo: vi.fn(async () => {}),
  handlePlayAgain: vi.fn(async () => {}),
  handleBackToStart: vi.fn(async () => {}),
  ...overrides,
});

const useGameSummaryPageMock = vi.fn(() => buildSummaryHookMockResult());

vi.mock("./useGameSummaryPage", () => ({
  useGameSummaryPage: () => useGameSummaryPageMock(),
}));

vi.mock("@nanostores/react", () => ({
  useStore: () => ({ startScore: 301 }),
}));

vi.mock("@/shared/ui/overview-player-item", () => ({
  OverviewPlayerItemList: () => <div data-testid="leaderboard-list" />,
}));

vi.mock("@/shared/ui/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

describe("GameSummaryPage", () => {
  beforeEach(() => {
    useGameSummaryPageMock.mockReset();
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult());
  });

  it("should render action buttons in one summary actions container when page is loaded", () => {
    render(<GameSummaryPage />);

    const playAgainButton = screen.getByRole("button", { name: "Play Again" });
    const backToStartButton = screen.getByRole("button", { name: "Back To Start" });

    const actionsContainer = playAgainButton.closest(`.${styles.summaryActions}`);
    expect(actionsContainer).not.toBeNull();
    expect(backToStartButton.closest(`.${styles.summaryActions}`)).toBe(actionsContainer);
    expect(playAgainButton.closest(`.${styles.playAgainWrap}`)).not.toBeNull();
    expect(backToStartButton.closest(`.${styles.backToStartWrap}`)).not.toBeNull();
  });

  it("should not render confetti canvas when page is loaded", () => {
    const { container } = render(<GameSummaryPage />);

    expect(container.querySelector("canvas")).toBeNull();
  });

  it("should render error panel when summary hook reports an error", () => {
    useGameSummaryPageMock.mockReturnValue(
      buildSummaryHookMockResult({
        error: "Could not load finished game data.",
      }),
    );

    render(<GameSummaryPage />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Summary action failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("should disable Play Again button when startGame is pending", () => {
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult({ starting: true }));

    render(<GameSummaryPage />);

    const playAgainButton = screen.getByRole("button", { name: "Play Again" });
    expect(playAgainButton.hasAttribute("disabled")).toBe(true);
  });

  it("should enable Play Again button when rematch start is not pending", () => {
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult({ starting: false }));

    render(<GameSummaryPage />);

    const playAgainButton = screen.getByRole("button", { name: "Play Again" });
    expect(playAgainButton.hasAttribute("disabled")).toBe(false);
  });
});
