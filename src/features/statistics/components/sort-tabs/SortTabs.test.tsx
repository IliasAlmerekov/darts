// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortTabs } from "./SortTabs";

describe("SortTabs", () => {
  it("calls onChange when another tab is clicked", () => {
    const onChange = vi.fn();

    render(<SortTabs value="alphabetically" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Score" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("score");
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();

    render(<SortTabs value="alphabetically" onChange={onChange} disabled />);

    const scoreButton = screen.getByRole("button", { name: "Score" });
    fireEvent.click(scoreButton);

    expect(scoreButton.getAttribute("aria-disabled")).toBe("true");
    expect(onChange).toHaveBeenCalledTimes(0);
  });
});
