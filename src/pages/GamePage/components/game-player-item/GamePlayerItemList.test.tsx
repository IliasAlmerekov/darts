// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { WinnerPlayerProps } from "@/types";
import GamePlayerItemList from "./GamePlayerItemList";

const createPlayer = (id: number, name: string, isActive: boolean): WinnerPlayerProps => ({
  id,
  name,
  score: 301,
  isActive,
  index: id - 1,
  isBust: false,
  isPlaying: true,
  position: id,
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
});
