// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsOverlay from "./SettingsOverlay";

vi.mock("@/shared/ui/overlay", () => ({
  Overlay: ({ children, isOpen }: { children: React.ReactNode; isOpen?: boolean }) =>
    isOpen ? <div data-testid="overlay">{children}</div> : null,
}));

vi.mock("@/shared/ui/button", () => ({
  SettingsGroupBtn: ({
    options,
    selectedId,
    onClick,
  }: {
    options: ReadonlyArray<{ label: string; id: string | number }>;
    selectedId?: string | number;
    onClick?: (id: string | number) => void;
  }) => (
    <div>
      <span data-testid="selected-mode">{String(selectedId)}</span>
      {options.map((option) => (
        <button key={option.id} type="button" onClick={() => onClick?.(option.id)}>
          {option.label}
        </button>
      ))}
      <button type="button" onClick={() => onClick?.("not-a-mode")}>
        invalid
      </button>
    </div>
  ),
  Button: ({
    label,
    handleClick,
    disabled,
  }: {
    label: string;
    handleClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={handleClick} disabled={disabled}>
      {label}
    </button>
  ),
}));

describe("SettingsOverlay", () => {
  it("renders initial single-out mode and saves it", () => {
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

    expect(screen.getByTestId("selected-mode").textContent).toBe("single-out");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: false });
  });

  it("updates to triple-out and ignores invalid values from the selector", () => {
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
    expect(screen.getByTestId("selected-mode").textContent).toBe("triple-out");

    fireEvent.click(screen.getByRole("button", { name: "invalid" }));
    expect(screen.getByTestId("selected-mode").textContent).toBe("triple-out");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ doubleOut: false, tripleOut: true });
  });

  it("resets internal mode when incoming props change and shows saving/error state", () => {
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
    expect(screen.getByTestId("selected-mode").textContent).toBe("double-out");

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

    expect(screen.getByTestId("selected-mode").textContent).toBe("triple-out");
    expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty("disabled", true);
    expect(screen.getByText("Save failed")).toBeTruthy();
  });
});
