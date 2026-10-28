// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import groupStyles from "./SettingsGroupBtn.module.css";
import useIsomorphicLayoutEffect from "@/shared/lib/useIsomorphicLayoutEffect";
import SettingsOverlay from "./SettingsOverlay";

// The selected game mode at each commit, read before passive effects run.
let selectedModeAtCommit: string[] = [];

function SelectedModeProbe(): null {
  useIsomorphicLayoutEffect(() => {
    selectedModeAtCommit.push(
      screen
        .getAllByRole("button")
        .filter((button) => button.classList.contains(groupStyles.active ?? ""))
        .map((button) => button.textContent ?? "")
        .join(","),
    );
  });
  return null;
}

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

  it("should keep the picked mode when a re-render leaves the initial props unchanged", () => {
    const onSave = vi.fn();
    const { rerender } = render(
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

    rerender(
      <SettingsOverlay
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        initialStartScore={301}
        initialDoubleOut={true}
        initialTripleOut={false}
        error="Save failed"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: true });
  });

  it("should reset the picked mode when only the initial start score changes", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <>
        <SettingsOverlay
          isOpen
          onClose={vi.fn()}
          onSave={onSave}
          initialStartScore={301}
          initialDoubleOut={true}
          initialTripleOut={false}
        />
        <SelectedModeProbe />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Triple-out" }));

    selectedModeAtCommit = [];
    rerender(
      <>
        <SettingsOverlay
          isOpen
          onClose={vi.fn()}
          onSave={onSave}
          initialStartScore={501}
          initialDoubleOut={true}
          initialTripleOut={false}
        />
        <SelectedModeProbe />
      </>,
    );

    expect(selectedModeAtCommit).toEqual(["Double-out"]);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ doubleOut: true, tripleOut: false });
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
