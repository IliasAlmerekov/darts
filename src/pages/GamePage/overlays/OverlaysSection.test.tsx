// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverlaysSection } from "./OverlaysSection";

type Props = ComponentProps<typeof OverlaysSection>;

function renderFinishOverlay(overrides: Partial<Props> = {}): Props {
  const props: Props = {
    shouldShowFinishOverlay: true,
    isFinishGameDisabled: false,
    isFinishPending: false,
    finishError: null,
    isExitOverlayOpen: false,
    isExitPending: false,
    isSettingsOpen: false,
    isSavingSettings: false,
    settingsError: null,
    initialStartScore: 301,
    initialDoubleOut: false,
    initialTripleOut: false,
    handleContinueGame: vi.fn(),
    handleUndoFromOverlay: vi.fn(),
    handleFinishGame: vi.fn(),
    handleCloseExitOverlay: vi.fn(),
    handleExitGame: vi.fn(async () => {}),
    handleCloseSettings: vi.fn(),
    handleSaveSettings: vi.fn(async () => {}),
    ...overrides,
  };
  render(<OverlaysSection {...props} />);
  return props;
}

describe("OverlaysSection finish overlay", () => {
  it("should name the dialog by its heading and show the subtitle", () => {
    renderFinishOverlay();

    const dialog = screen.getByRole("dialog", { name: "Player Finished!" });

    expect(within(dialog).getByText("Continue the game with the remaining players?")).toBeTruthy();
  });

  it("should list Continue game, Finish game and Undo last throw in that order", () => {
    renderFinishOverlay();

    const labels = within(screen.getByRole("dialog"))
      .getAllByRole("button")
      .map((button) => button.textContent);

    expect(labels).toEqual(["Continue game", "Finish game", "Undo last throw"]);
  });

  it("should call each handler from its button", () => {
    const props = renderFinishOverlay();

    fireEvent.click(screen.getByRole("button", { name: "Continue game" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish game" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo last throw" }));

    expect(props.handleContinueGame).toHaveBeenCalledTimes(1);
    expect(props.handleFinishGame).toHaveBeenCalledTimes(1);
    expect(props.handleUndoFromOverlay).toHaveBeenCalledTimes(1);
  });

  it("should disable only Finish game when isFinishGameDisabled is set", () => {
    renderFinishOverlay({ isFinishGameDisabled: true });

    expect(screen.getByRole("button", { name: "Finish game" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Continue game" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Undo last throw" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("should disable Continue game and Undo last throw while the finish is pending", () => {
    renderFinishOverlay({ isFinishPending: true });

    expect(screen.getByRole("button", { name: "Continue game" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Undo last throw" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("should show finishError as an alert inside the dialog", () => {
    renderFinishOverlay({ finishError: "Could not finish the game." });

    const alert = within(screen.getByRole("dialog")).getByRole("alert");

    expect(alert.textContent).toBe("Could not finish the game.");
  });
});
