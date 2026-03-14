// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "./PodiumPlayerCard.module.css";
import PodiumPlayerCard from "./PodiumPlayerCard";

function buildProps(): {
  name: string;
  placement: string;
  rounds: number;
  averagePerRound: string;
} {
  return {
    name: "Alice",
    placement: "1.",
    rounds: 10,
    averagePerRound: "45.50",
  };
}

describe("PodiumPlayerCard", () => {
  it("should apply module typography classes when rendering stats", () => {
    render(<PodiumPlayerCard {...buildProps()} />);

    const playerName = screen.getByText("Alice");
    const card = playerName.closest(`.${styles.podiumPlayerCard}`);
    expect(card).toBeTruthy();

    if (card === null) {
      throw new Error("Expected the podium player card to be rendered.");
    }

    const typographyBlocks = card.querySelectorAll(`.${styles.copylarge}`);
    expect(typographyBlocks).toHaveLength(3);
    expect(card.querySelector(".copylarge")).toBeNull();
  });
});
