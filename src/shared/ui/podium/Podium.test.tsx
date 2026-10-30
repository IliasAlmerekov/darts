// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StandingsEntry } from "@/lib/game/finishedGameStandings";
import cardStyles from "./PodiumPlayerCard.module.css";
import podiumStyles from "./Podium.module.css";
import Podium from "./Podium";

const buildPlayer = (
  id: number,
  name: string,
  rounds: number,
  threeDartAverage: string,
): StandingsEntry => ({ id, name, rounds, threeDartAverage });

const placeholder: StandingsEntry = {
  id: 0,
  name: "-",
  rounds: 0,
  threeDartAverage: "-",
  isPlaceholder: true,
};

describe("Podium", () => {
  it("should mark first place as winner when the podium is rendered", () => {
    render(
      <Podium
        userMap={[
          buildPlayer(1, "Alice", 10, "45.50"),
          buildPlayer(2, "Bob", 11, "40.20"),
          buildPlayer(3, "Cara", 12, "39.90"),
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

    expect(winnerBadge.closest(`.${cardStyles.winnerCard}`)).toBeTruthy();
  });

  it("should preserve player cards when the podium order changes", () => {
    const players = [
      buildPlayer(1, "Alice", 10, "45.50"),
      buildPlayer(2, "Bob", 11, "40.20"),
      buildPlayer(3, "Cara", 12, "39.90"),
    ];
    const { rerender } = render(<Podium userMap={players} />);

    const aliceCardBeforeReorder = screen.getByText("Alice").closest(`.${cardStyles.playerName}`);
    expect(aliceCardBeforeReorder).toBeTruthy();

    const [firstPlayer, secondPlayer, thirdPlayer] = players;
    expect(firstPlayer).toBeDefined();
    expect(secondPlayer).toBeDefined();
    expect(thirdPlayer).toBeDefined();

    if (firstPlayer === undefined || secondPlayer === undefined || thirdPlayer === undefined) {
      throw new Error("Expected the players fixture to contain exactly three players.");
    }

    rerender(<Podium userMap={[thirdPlayer, secondPlayer, firstPlayer]} />);

    const aliceCardAfterReorder = screen.getByText("Alice").closest(`.${cardStyles.playerName}`);
    expect(aliceCardAfterReorder).toBe(aliceCardBeforeReorder);
  });

  it("should show the rank by podium slot", () => {
    render(
      <Podium
        userMap={[
          buildPlayer(2, "Bob", 11, "40.20"),
          buildPlayer(1, "Alice", 10, "45.50"),
          buildPlayer(3, "Cara", 12, "39.90"),
        ]}
      />,
    );

    const namesByRank = ["1.", "2.", "3."].map(
      (rank) =>
        screen
          .getByText(rank, { exact: true })
          .closest(`.${podiumStyles.podiumPlayerCard}`)
          ?.querySelector(`.${cardStyles.playerName}`)?.textContent,
    );
    expect(namesByRank).toEqual(["Bob", "Alice", "Cara"]);
  });

  it("should hide the podium placeholder card in a two-player game", () => {
    render(
      <Podium
        userMap={[
          buildPlayer(1, "Alice", 10, "45.50"),
          buildPlayer(2, "Bob", 11, "40.20"),
          placeholder,
        ]}
      />,
    );

    const cards = screen
      .getAllByRole("group", { name: "three-dart average" })
      .map((average) => average.closest(`.${podiumStyles.podiumPlayerCard}`));
    expect(cards.map((card) => card?.classList.contains(podiumStyles.hide ?? ""))).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe("Podium three-dart average", () => {
  it("should show the prepared three-dart average under its accessible name", () => {
    render(<Podium userMap={[buildPlayer(1, "Anna", 2, "60.60")]} />);

    const average = screen.getByRole("group", { name: "three-dart average" });
    expect(average.textContent).toBe("Ø AVG60.60");
  });

  it("should show a dash for the podium placeholder", () => {
    render(<Podium userMap={[placeholder]} />);

    expect(screen.getByRole("group", { name: "three-dart average" }).textContent).toBe("Ø AVG-");
  });
});
