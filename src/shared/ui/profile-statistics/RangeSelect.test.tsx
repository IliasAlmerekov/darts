// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RangeSelect } from "./RangeSelect";

const OUT_RULES = [
  { value: "all", label: "All games" },
  { value: "doubleout", label: "Double-Out" },
] as const;

describe("RangeSelect", () => {
  it("names the range on the trigger and lists it in the menu", async () => {
    render(
      <RangeSelect
        label="Games in the scoring trend"
        options={[{ value: "last10", label: "Last 10 games" }]}
        value="last10"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Games in the scoring trend: Last 10 games",
    });
    fireEvent.click(trigger);

    expect(await screen.findByRole("menuitem", { name: "Last 10 games" })).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("reports the option the user picks", async () => {
    const onSelect = vi.fn();
    render(<RangeSelect label="Games" options={OUT_RULES} value="all" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Games: All games" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Double-Out" }));

    expect(onSelect).toHaveBeenCalledWith("doubleout");
  });

  it("shows the selected option on the trigger", () => {
    render(<RangeSelect label="Games" options={OUT_RULES} value="doubleout" />);

    expect(screen.getByRole("button", { name: "Games: Double-Out" }).textContent).toBe(
      "Double-Out",
    );
  });
});
