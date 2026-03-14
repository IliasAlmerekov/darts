// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WinnerPlayerProps } from "@/types";
import OverviewPlayerItemList from "./OverviewPlayerItemList";

function buildPlayer(overrides: Partial<WinnerPlayerProps> = {}): WinnerPlayerProps {
  return {
    id: 4,
    name: "Dylan",
    score: 0,
    isActive: false,
    index: 3,
    rounds: [{ throw1: 20 }],
    roundCount: 3,
    scoreAverage: 48.34343435465,
    ...overrides,
  };
}

describe("OverviewPlayerItemList", () => {
  it("should format the average per round with two decimal places when rendering the list", () => {
    render(<OverviewPlayerItemList userMap={[buildPlayer()]} />);

    expect(screen.getByText("48.34")).toBeTruthy();
    expect(screen.queryByText("48.34343435465")).toBeNull();
  });
});
