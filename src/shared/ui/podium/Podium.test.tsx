// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WinnerPlayerProps } from "@/types";
import styles from "./PodiumPlayerCard.module.css";
import Podium from "./Podium";

const buildPlayer = (
  id: number,
  name: string,
  score: number,
  roundCount: number,
  scoreAverage: number,
): WinnerPlayerProps => ({
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
  it("should mark first place as winner when the podium is rendered", () => {
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
    const winnerBadge = winnerBadges[0];
    expect(winnerBadge).toBeDefined();

    if (winnerBadge === undefined) {
      throw new Error("Expected a winner badge to be rendered.");
    }

    expect(winnerBadge.closest(`.${styles.winnerCard}`)).toBeTruthy();
  });

  it("should preserve player cards when the podium order changes", () => {
    const players = [
      buildPlayer(1, "Alice", 0, 10, 45.5),
      buildPlayer(2, "Bob", 0, 11, 40.2),
      buildPlayer(3, "Cara", 0, 12, 39.9),
    ];
    const { rerender } = render(<Podium userMap={players} list={players} />);

    const aliceCardBeforeReorder = screen.getByText("Alice").closest(`.${styles.playerName}`);
    expect(aliceCardBeforeReorder).toBeTruthy();

    const [firstPlayer, secondPlayer, thirdPlayer] = players;
    expect(firstPlayer).toBeDefined();
    expect(secondPlayer).toBeDefined();
    expect(thirdPlayer).toBeDefined();

    if (firstPlayer === undefined || secondPlayer === undefined || thirdPlayer === undefined) {
      throw new Error("Expected the players fixture to contain exactly three players.");
    }

    const reorderedPlayers = [thirdPlayer, secondPlayer, firstPlayer];
    rerender(<Podium userMap={reorderedPlayers} list={reorderedPlayers} />);

    const aliceCardAfterReorder = screen.getByText("Alice").closest(`.${styles.playerName}`);
    expect(aliceCardAfterReorder).toBe(aliceCardBeforeReorder);
  });
});
