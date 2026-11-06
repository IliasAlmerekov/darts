// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberButton } from "./NumberButton";

/** Returns false when the handler cancelled the touchend. */
function touch(button: HTMLElement, from: [number, number], to: [number, number]): boolean {
  const start = { clientX: from[0], clientY: from[1] };
  fireEvent.touchStart(button, { touches: [start], targetTouches: [start] });
  return fireEvent.touchEnd(button, {
    changedTouches: [{ clientX: to[0], clientY: to[1] }],
    touches: [],
    targetTouches: [],
  });
}

describe("NumberButton", () => {
  it("should act on each fast tap and cancel its touchend, so WebKit neither waits nor zooms", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} />);
    const button = screen.getByRole("button", { name: "5" });

    const results = [touch(button, [20, 20], [22, 21]), touch(button, [20, 20], [20, 20])];

    expect(handleClick).toHaveBeenCalledTimes(2);
    expect(results).toEqual([false, false]);
  });

  it("should not act when the finger slides past the tap slop, as in a scroll", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} />);

    touch(screen.getByRole("button", { name: "5" }), [20, 20], [20, 60]);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should leave a touchend to the browser while another finger is still on the button", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} />);
    const button = screen.getByRole("button", { name: "5" });
    const first = { clientX: 20, clientY: 20 };
    const second = { clientX: 30, clientY: 30 };

    fireEvent.touchStart(button, { touches: [first, second], targetTouches: [first, second] });
    const notCancelled = fireEvent.touchEnd(button, {
      changedTouches: [first],
      touches: [second],
      targetTouches: [second],
    });

    expect(handleClick).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });

  it("should count both taps when two fingers overlap on different buttons", () => {
    const onFive = vi.fn();
    const onTwenty = vi.fn();
    render(
      <>
        <NumberButton value={5} handleClick={onFive} />
        <NumberButton value={20} handleClick={onTwenty} />
      </>,
    );
    const five = screen.getByRole("button", { name: "5" });
    const twenty = screen.getByRole("button", { name: "20" });
    const left = { clientX: 20, clientY: 20 };
    const right = { clientX: 120, clientY: 20 };

    fireEvent.touchStart(five, { touches: [left], targetTouches: [left] });
    fireEvent.touchStart(twenty, { touches: [left, right], targetTouches: [right] });
    fireEvent.touchEnd(five, { changedTouches: [left], touches: [right], targetTouches: [] });
    fireEvent.touchEnd(twenty, { changedTouches: [right], touches: [], targetTouches: [] });

    expect(onFive).toHaveBeenCalledTimes(1);
    expect(onTwenty).toHaveBeenCalledTimes(1);
  });

  it("should leave a touchend it cannot cancel to the click that follows it", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} />);
    const button = screen.getByRole("button", { name: "5" });
    const point = { clientX: 20, clientY: 20 };

    fireEvent.touchStart(button, { touches: [point], targetTouches: [point] });
    fireEvent.touchEnd(button, {
      cancelable: false,
      changedTouches: [point],
      touches: [],
      targetTouches: [],
    });

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should not act on a tap while disabled", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} disabled />);

    touch(screen.getByRole("button", { name: "5" }), [20, 20], [20, 20]);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should still act on click, for mouse, keyboard and VoiceOver", () => {
    const handleClick = vi.fn();
    render(<NumberButton value={5} handleClick={handleClick} />);

    fireEvent.click(screen.getByRole("button", { name: "5" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
