// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Overlay from "./Overlay";

describe("Overlay", () => {
  it("should render as a modal dialog and close when Escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <Overlay isOpen onClose={onClose}>
        <button type="button">First action</button>
      </Overlay>,
    );

    const dialog = screen.getByRole("dialog");

    expect(dialog.getAttribute("aria-modal")).toBe("true");

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should move focus into the dialog and trap keyboard navigation when opened", () => {
    render(
      <>
        <button type="button">Open overlay</button>
        <Overlay isOpen onClose={() => {}}>
          <button type="button">First action</button>
          <button type="button">Second action</button>
        </Overlay>
      </>,
    );

    const openButton = screen.getByRole("button", { name: "Open overlay" });
    const closeButton = screen.getByRole("button", { name: "Close overlay" });
    const firstActionButton = screen.getByRole("button", { name: "First action" });
    const secondActionButton = screen.getByRole("button", { name: "Second action" });

    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: "Tab" });
    expect(document.activeElement).toBe(firstActionButton);

    fireEvent.keyDown(firstActionButton, { key: "Tab" });
    expect(document.activeElement).toBe(secondActionButton);

    fireEvent.keyDown(secondActionButton, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(secondActionButton);

    expect(document.activeElement).not.toBe(openButton);
  });
});
