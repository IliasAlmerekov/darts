// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
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

  it("should not scroll again when active player id stays the same across rerenders", () => {
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
});
