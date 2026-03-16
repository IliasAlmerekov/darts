// @vitest-environment jsdom

const unlockSoundsMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/browser/soundPlayer", () => ({
  unlockSounds: () => unlockSoundsMock(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Keyboard } from "./Keyboard";

describe("Keyboard", () => {
  beforeEach(() => {
    unlockSoundsMock.mockReset();
  });

  it("should send a doubled score and reset the toggle when double mode is active", () => {
    const onThrow = vi.fn();
    render(<Keyboard onThrow={onThrow} />);

    fireEvent.click(screen.getByRole("button", { name: "Double" }));
    fireEvent.click(screen.getByRole("button", { name: "20" }));

    expect(onThrow).toHaveBeenCalledWith("D20");
    expect(screen.getByRole("button", { name: "Double" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(unlockSoundsMock).toHaveBeenCalledTimes(2);
  });

  it("should switch to triple mode and disable unsupported targets when triple is toggled after double", () => {
    const onThrow = vi.fn();
    render(<Keyboard onThrow={onThrow} />);

    fireEvent.click(screen.getByRole("button", { name: "Double" }));
    fireEvent.click(screen.getByRole("button", { name: "Triple" }));

    expect(screen.getByRole("button", { name: "Double" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: "Triple" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "25" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "0" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "19" }));

    expect(onThrow).toHaveBeenCalledWith("T19");
  });

  it("should send a plain number when no multiplier is active", () => {
    const onThrow = vi.fn();
    render(<Keyboard onThrow={onThrow} />);

    fireEvent.click(screen.getByRole("button", { name: "18" }));

    expect(onThrow).toHaveBeenCalledWith(18);
    expect(unlockSoundsMock).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when the keyboard is disabled", () => {
    const onThrow = vi.fn();
    render(<Keyboard onThrow={onThrow} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Double" }));
    fireEvent.click(screen.getByRole("button", { name: "20" }));

    expect(onThrow).not.toHaveBeenCalled();
    expect(unlockSoundsMock).not.toHaveBeenCalled();
  });
});
