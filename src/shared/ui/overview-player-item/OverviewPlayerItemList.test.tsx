// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StandingsEntry } from "@/lib/game/finishedGameStandings";
import OverviewPlayerItemList from "./OverviewPlayerItemList";

function buildEntry(overrides: Partial<StandingsEntry> = {}): StandingsEntry {
  return {
    id: 4,
    name: "Dylan",
    rounds: 3,
    threeDartAverage: "48.34",
    ...overrides,
  };
}

describe("OverviewPlayerItemList", () => {
  it("should label the prepared average Ø AVG with the accessible name three-dart average", () => {
    render(<OverviewPlayerItemList userMap={[buildEntry({ threeDartAverage: "60.60" })]} />);

    const average = screen.getByRole("group", { name: "three-dart average" });
    expect(average.textContent).toBe("Ø AVG 60.60");
    expect(screen.queryByText(/Ø Round/)).toBeNull();
  });

  it("should show each entry's prepared average in leaderboard order", () => {
    render(
      <OverviewPlayerItemList
        userMap={[
          buildEntry({ id: 4, name: "Idle", rounds: 0, threeDartAverage: "-" }),
          buildEntry({ id: 5, name: "Busted", rounds: 3, threeDartAverage: "0.00" }),
        ]}
      />,
    );

    const averages = screen.getAllByRole("group", { name: "three-dart average" });
    expect(averages.map((average) => average.textContent)).toEqual(["Ø AVG -", "Ø AVG 0.00"]);
  });

  it("should start leaderboard placements from fourth place when the list continues after the podium", () => {
    render(
      <OverviewPlayerItemList
        userMap={[buildEntry({ id: 4, name: "Dylan" }), buildEntry({ id: 5, name: "Eve" })]}
      />,
    );

    expect(screen.getByRole("heading", { level: 4, name: "4" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "5" })).toBeTruthy();
  });
});
