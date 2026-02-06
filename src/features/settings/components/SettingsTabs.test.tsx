// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsTabs } from "./SettingsTabs";

describe("SettingsTabs", () => {
  it("calls onChange with selected option id", () => {
    const onChange = vi.fn();

    render(
      <SettingsTabs
        title="GAME MODE"
        options={[
          { id: "single-out", label: "Single-out" },
          { id: "double-out", label: "Double-out" },
          { id: "triple-out", label: "Triple-out" },
        ]}
        selectedId="single-out"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Double-out" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("double-out");
  });
});
