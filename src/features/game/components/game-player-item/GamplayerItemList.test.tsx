// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import GamePlayerItemList from "./GamplayerItemList";

const createPlayer = (id: number, name: string, isActive: boolean): BASIC.WinnerPlayerProps =>
  ({
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
  }) as BASIC.WinnerPlayerProps;

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
    vi.unstubAllGlobals();
  });

  it("scrolls to active player", () => {
    vi.useFakeTimers();

    render(
      <GamePlayerItemList
        userMap={[createPlayer(1, "Player 1", false), createPlayer(2, "Player 2", true)]}
        score={301}
        round={1}
      />,
    );

    vi.runAllTimers();

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    vi.useRealTimers();
  });

  it("does not scroll when there is no active player", () => {
    render(
      <GamePlayerItemList
        userMap={[createPlayer(1, "Player 1", false), createPlayer(2, "Player 2", false)]}
        score={301}
        round={1}
      />,
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

});
