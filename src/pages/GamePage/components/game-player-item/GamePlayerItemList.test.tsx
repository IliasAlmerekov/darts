// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mapPlayersToUI } from "@/lib/game/player-mappers";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { applyOptimisticThrow, applyOptimisticUndo } from "../../lib/optimisticThrow.logic";
import type { WinnerPlayerProps } from "@/types";
import GamePlayerItemList from "./GamePlayerItemList";

// Each GamePlayerItem render reads `styles.throws` exactly once and the list never reads it,
// so the read count is the number of row renders.
const rowRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock("./GamePlayerItem.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key): string | undefined => {
        if (typeof key !== "string") return undefined;
        if (key === "throws") rowRenders.count += 1;
        return key;
      },
    },
  ),
}));

const createPlayer = (id: number, name: string, isActive: boolean): WinnerPlayerProps => ({
  id,
  name,
  score: 301,
  isActive,
  index: id - 1,
  isBust: false,
  isPlaying: true,
  throwCount: 0,
  rounds: [],
});

describe("GamePlayerItemList", () => {
  const scrollIntoViewMock = vi.fn();
  // What the browser shows at a point; jsdom has no layout, so tests say it.
  const elementFromPointMock = vi.fn<(x: number, y: number) => Element | null>();

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
    // By default the active player is fully on screen.
    elementFromPointMock.mockImplementation(() => document.querySelector('[aria-current="true"]'));
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: elementFromPointMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("should scroll to active player when active player is present", () => {
    vi.useFakeTimers();

    render(
      <GamePlayerItemList
        userMap={[createPlayer(1, "Player 1", false), createPlayer(2, "Player 2", true)]}
        round={1}
      />,
    );

    vi.runAllTimers();

    expect(screen.getByRole("group", { name: "Player 2" }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(document.activeElement?.getAttribute("data-active-player")).toBe("true");
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    vi.useRealTimers();
  });

  it("should not scroll when there is no active player", () => {
    render(
      <GamePlayerItemList
        userMap={[createPlayer(1, "Player 1", false), createPlayer(2, "Player 2", false)]}
        round={1}
      />,
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("should focus the active player inside the rendered list when a matching node exists outside", () => {
    vi.useFakeTimers();

    render(
      <>
        <button data-active-player="true" tabIndex={-1} type="button">
          Outside active player
        </button>
        <GamePlayerItemList
          userMap={[createPlayer(1, "Player 1", false), createPlayer(2, "Player 2", true)]}
          round={1}
        />
      </>,
    );

    vi.runAllTimers();

    const activePlayer = screen.getByRole("group", { name: "Player 2" });

    expect(document.activeElement).toBe(activePlayer);
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.instances[0]).toBe(activePlayer);
  });

  // A tap that stops the scroll can leave either edge hidden: the top above the viewport,
  // or the bottom under the sticky keypad. Each edge alone must trigger the second scroll.
  it.each(["top", "bottom"] as const)(
    "should scroll back to the active player after a throw when a tap left its %s edge hidden",
    (hiddenEdge) => {
      vi.useFakeTimers();

      const { rerender } = render(
        <GamePlayerItemList
          userMap={[createPlayer(1, "Player 1", true), createPlayer(2, "Player 2", false)]}
          round={1}
        />,
      );
      vi.runAllTimers();
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

      // The card spans y 100..200; something else covers the hidden edge's half.
      const activePlayer = screen.getByRole("group", { name: "Player 1" });
      vi.spyOn(activePlayer, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 100, 100, 100),
      );
      const cover = document.createElement("div");
      document.body.append(cover);
      elementFromPointMock.mockImplementation((_x, y) => {
        const isTopHalf = y < 150;
        return isTopHalf === (hiddenEdge === "top") ? cover : activePlayer;
      });

      rerender(
        <GamePlayerItemList
          userMap={[
            { ...createPlayer(1, "Player 1", true), score: 281 },
            createPlayer(2, "Player 2", false),
          ]}
          round={1}
        />,
      );
      vi.runAllTimers();

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
      expect(scrollIntoViewMock.mock.instances[1]).toBe(activePlayer);
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    },
  );

  it("should not scroll again while the active player stays on screen across rerenders", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <GamePlayerItemList
        userMap={[createPlayer(1, "Player 1", true), createPlayer(2, "Player 2", false)]}
        round={1}
      />,
    );

    vi.runAllTimers();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    rerender(
      <GamePlayerItemList
        userMap={[
          { ...createPlayer(1, "Player 1", true), score: 281 },
          createPlayer(2, "Player 2", false),
        ]}
        round={1}
      />,
    );

    vi.runAllTimers();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  it("should re-render only the row whose data changed when the list gets an equal player", () => {
    const createPlayerWithRounds = (): WinnerPlayerProps => ({
      ...createPlayer(1, "Player 1", false),
      score: 240,
      isBust: true,
      rounds: [
        { throw1: 20, throw1IsDouble: true, throw2: 19, throw2IsTriple: true, throw3: 0 },
        { throw1: 5, throw1IsBust: true },
      ],
    });

    const { rerender } = render(
      <GamePlayerItemList
        userMap={[createPlayerWithRounds(), createPlayer(2, "Player 2", true)]}
        round={2}
      />,
    );
    const rendersAfterMount = rowRenders.count;

    rerender(
      <GamePlayerItemList
        userMap={[createPlayerWithRounds(), { ...createPlayer(2, "Player 2", true), score: 281 }]}
        round={2}
      />,
    );

    expect(rowRenders.count - rendersAfterMount).toBe(1);
  });
  it("updates the accessible suggestion with the active score and suppresses it when finished", () => {
    const player = { ...createPlayer(1, "Player 1", true), score: 70 };
    const { rerender } = render(
      <GamePlayerItemList userMap={[player]} round={1} mode="double-out" />,
    );
    expect(screen.getByText("Checkout: T10, D20")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Player 1" }).getAttribute("aria-describedby")).toBe(
      "checkout-score",
    );
    expect(screen.getByText("10").closest('[aria-hidden="true"]')?.textContent).toBe("T10");
    rerender(
      <GamePlayerItemList
        userMap={[{ ...player, score: 30, throwCount: 2, rounds: [{ throw1: 20, throw2: 20 }] }]}
        round={1}
        mode="double-out"
      />,
    );
    expect(screen.getByText("Checkout: D15")).toBeTruthy();
    rerender(<GamePlayerItemList userMap={[player]} round={1} mode="double-out" gameFinished />);
    expect(screen.queryByText(/Checkout:/)).toBeNull();
  });
  it("ignores a previous turn when the active player has no throws", () => {
    const player = {
      ...createPlayer(1, "Player 1", true),
      score: 170,
      rounds: [{ throw1: 20, throw2: 20, throw3: 20 }],
    };
    render(<GamePlayerItemList userMap={[player]} round={1} mode="double-out" />);
    expect(screen.getByText("Checkout: T20, T20, D25")).toBeTruthy();
  });

  it("hides suggestions for waiting and finished players and unreachable scores", () => {
    render(
      <GamePlayerItemList
        userMap={[
          { ...createPlayer(1, "Waiting", false), score: 30 },
          { ...createPlayer(2, "Finished", true), score: 30, isPlaying: false },
          { ...createPlayer(3, "Bogey", true), score: 169 },
        ]}
        round={1}
        mode="double-out"
      />,
    );
    expect(screen.queryByText(/Checkout:/)).toBeNull();
  });
  it("tracks optimistic throws, busts and undo", () => {
    const state = buildGameThrowsResponse({
      settings: { startScore: 301, doubleOut: true, tripleOut: false },
      players: [
        buildBackendPlayer({ id: 1, name: "Alice", score: 70, isActive: true }),
        buildBackendPlayer({ id: 2, name: "Bob", score: 30 }),
      ],
    });
    const view = (game: typeof state) => (
      <GamePlayerItemList
        userMap={mapPlayersToUI(game.players, game.currentRound)}
        round={game.currentRound}
        mode="double-out"
      />
    );
    const { rerender } = render(view(state));
    expect(screen.getByText("Checkout: T10, D20")).toBeTruthy();
    const afterThrow = applyOptimisticThrow(state, { value: 20, isDouble: false, isTriple: false });
    expect(afterThrow).not.toBeNull();
    if (!afterThrow) return;
    rerender(view(afterThrow));
    expect(screen.getByText("Checkout: D25")).toBeTruthy();
    const afterBust = applyOptimisticThrow(afterThrow, {
      value: 20,
      isDouble: false,
      isTriple: true,
    });
    expect(afterBust).not.toBeNull();
    if (!afterBust) return;
    rerender(view(afterBust));
    expect(screen.getByText("Checkout: D15")).toBeTruthy();
    const afterUndo = applyOptimisticUndo(afterBust);
    expect(afterUndo).not.toBeNull();
    if (!afterUndo) return;
    rerender(view(afterUndo));
    expect(screen.getByText("Checkout: D25")).toBeTruthy();
  });
});
