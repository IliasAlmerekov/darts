// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "./OverviewPlayerItem.module.css";
import OverviewPlayerItem from "./OverviewPlayerItem";

function buildProps(): {
  name: string;
  placement: number;
  rounds: number;
  averagePerRound: string;
} {
  return {
    name: "Dylan",
    placement: 4,
    rounds: 3,
    averagePerRound: "48.34",
  };
}

describe("OverviewPlayerItem", () => {
  it("should apply module typography classes when rendering player details", () => {
    render(<OverviewPlayerItem {...buildProps()} />);

    const playerName = screen.getByText("Dylan");
    const item = playerName.closest(`.${styles.overviewPlayerItem}`);
    expect(item).toBeTruthy();

    if (item === null) {
      throw new Error("Expected the overview player item to be rendered.");
    }

    const typographyBlocks = item.querySelectorAll(`.${styles.copylarge}`);
    expect(typographyBlocks).toHaveLength(3);
    expect(item.querySelector(".copylarge")).toBeNull();
  });
});
