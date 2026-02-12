// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import styles from "./GameSummaryPage.module.css";
import GameSummaryPage from "./GameSummaryPage";

type GameSummaryHookMockResult = {
  error: string | null;
  podiumData: BASIC.WinnerPlayerProps[];
  newList: BASIC.WinnerPlayerProps[];
  leaderBoardList: BASIC.WinnerPlayerProps[];
  loadSummary: () => void;
  handleUndo: () => Promise<void>;
  handlePlayAgain: () => Promise<void>;
  handleBackToStart: () => Promise<void>;
};

const buildSummaryHookMockResult = (
  overrides: Partial<GameSummaryHookMockResult> = {},
): GameSummaryHookMockResult => ({
  error: null,
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

vi.mock("../hooks/useGameSummaryPage", () => ({
  useGameSummaryPage: () => useGameSummaryPageMock(),
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
  beforeEach(() => {
    useGameSummaryPageMock.mockReset();
    useGameSummaryPageMock.mockReturnValue(buildSummaryHookMockResult());
  });

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

  it("renders error panel when summary hook reports error", () => {
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
});
