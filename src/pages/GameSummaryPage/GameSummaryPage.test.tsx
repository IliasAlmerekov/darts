// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import styles from "./GameSummaryPage.module.css";
import type { WinnerPlayerProps } from "@/types";
import GameSummaryPage from ".";
import type { SummarySettings } from "./useGameSummaryPage";

type GameSummaryHookMockResult = {
  error: string | null;
  leaving: boolean;
  settings: SummarySettings;
  loadSettings: () => Promise<void>;
  isActionPending: boolean;
  podiumData: WinnerPlayerProps[];
  standings: WinnerPlayerProps[];
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
  leaving: false,
  settings: { status: "ready", startScore: 301 },
  loadSettings: vi.fn(async () => {}),
  isActionPending: false,
  podiumData: [],
  standings: [],
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

  it("should show the locked game message without Retry while the page moves away", () => {
    useGameSummaryPageMock.mockReturnValue(
      buildSummaryHookMockResult({
        error: "This game can no longer be changed.",
        leaving: true,
      }),
    );

    render(<GameSummaryPage />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("This game can no longer be changed.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("should disable Undo and Rematch while the page moves away", () => {
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult({ leaving: true }));

    render(<GameSummaryPage />);

    for (const name of ["Return to game", "Play Again", "Back To Start"]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
    }
  });

  it("should disable every summary action while one is pending", () => {
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult({ isActionPending: true }));

    render(<GameSummaryPage />);

    for (const name of ["Return to game", "Play Again", "Back To Start"]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
    }
  });

  it("should enable every summary action when none is pending", () => {
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult({ isActionPending: false }));

    render(<GameSummaryPage />);

    for (const name of ["Return to game", "Play Again", "Back To Start"]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(false);
    }
  });
});
