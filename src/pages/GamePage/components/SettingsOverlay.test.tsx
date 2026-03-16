// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsOverlay from "./SettingsOverlay";

describe("SettingsOverlay", () => {
  it("should save single-out mode when initialized without checkout mode", () => {
    const onSave = vi.fn();
    render(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={301}
        initialDoubleOut={false}
        initialTripleOut={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: false });
  });

  it("should update to triple-out mode when triple-out is selected", () => {
    const onSave = vi.fn();
    render(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={301}
        initialDoubleOut={true}
        initialTripleOut={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Triple-out" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: true });
  });

  it("should reset internal mode and show saving or error state when props change", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={301}
        initialDoubleOut={false}
        initialTripleOut={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    rerender(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={501}
        initialDoubleOut={false}
        initialTripleOut={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: true });

    rerender(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={501}
        initialDoubleOut={false}
        initialTripleOut={true}
        isSaving
        error="Save failed"
      />,
    );

    expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty("disabled", true);
    expect(screen.getByText("Save failed")).toBeTruthy();
  });
});
