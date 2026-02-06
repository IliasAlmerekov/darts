// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "./PodiumPlayerCard.module.css";
import Podium from "./Podium";

const buildPlayer = (
  id: number,
  name: string,
  score: number,
  roundCount: number,
  scoreAverage: number,
): BASIC.WinnerPlayerProps => ({
  id,
  name,
  score,
  isActive: false,
  index: id - 1,
  rounds: [{ throw1: 20 }],
  roundCount,
  scoreAverage,
});

describe("Podium", () => {
  it("marks first place as winner with badge and blue border", () => {
    render(
      <Podium
        userMap={[
          buildPlayer(1, "Alice", 0, 10, 45.5),
          buildPlayer(2, "Bob", 0, 11, 40.2),
          buildPlayer(3, "Cara", 0, 12, 39.9),
        ]}
        list={[
          buildPlayer(1, "Alice", 0, 10, 45.5),
          buildPlayer(2, "Bob", 0, 11, 40.2),
          buildPlayer(3, "Cara", 0, 12, 39.9),
        ]}
      />,
    );

    const winnerBadges = screen.getAllByText("WINNER");
    expect(winnerBadges).toHaveLength(1);
    expect(winnerBadges[0].closest(`.${styles.winnerCard}`)).toBeTruthy();
  });
});
