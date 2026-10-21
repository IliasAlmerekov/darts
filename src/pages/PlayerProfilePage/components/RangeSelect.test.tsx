// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RangeSelect } from "./RangeSelect";

describe("RangeSelect", () => {
  it("names the range on the trigger and lists it in the menu", async () => {
    render(<RangeSelect label="Games in the scoring trend" option="Last 10 games" />);

    const trigger = screen.getByRole("button", {
      name: "Games in the scoring trend: Last 10 games",
    });
    fireEvent.click(trigger);

    expect(await screen.findByRole("menuitem", { name: "Last 10 games" })).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
