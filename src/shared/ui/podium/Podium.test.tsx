// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WinnerPlayerProps } from "@/types";
import cardStyles from "./PodiumPlayerCard.module.css";
import podiumStyles from "./Podium.module.css";
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

    expect(winnerBadge.closest(`.${cardStyles.winnerCard}`)).toBeTruthy();
  });

  it("should preserve player cards when the podium order changes", () => {
    const players = [
      buildPlayer(1, "Alice", 0, 10, 45.5),
      buildPlayer(2, "Bob", 0, 11, 40.2),
      buildPlayer(3, "Cara", 0, 12, 39.9),
    ];
    const { rerender } = render(<Podium userMap={players} list={players} />);

    const aliceCardBeforeReorder = screen.getByText("Alice").closest(`.${cardStyles.playerName}`);
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

    const aliceCardAfterReorder = screen.getByText("Alice").closest(`.${cardStyles.playerName}`);
    expect(aliceCardAfterReorder).toBe(aliceCardBeforeReorder);
  });

  it("should hide the third podium slot when only two players are in the list", () => {
    const userMap = [
      buildPlayer(1, "Alice", 0, 10, 45.5),
      buildPlayer(2, "Bob", 0, 11, 40.2),
      buildPlayer(3, "Cara", 0, 12, 39.9),
    ];
    const [firstPlayer, secondPlayer] = userMap;
    expect(firstPlayer).toBeDefined();
    expect(secondPlayer).toBeDefined();

    if (firstPlayer === undefined || secondPlayer === undefined) {
      throw new Error("Expected the two-player podium fixture to contain exactly two players.");
    }

    const twoPlayerList = [firstPlayer, secondPlayer];
    render(<Podium userMap={userMap} list={twoPlayerList} />);

    const thirdPlayerCard = screen.getByText("Cara").closest(`.${podiumStyles.podiumPlayerCard}`);
    expect(thirdPlayerCard).toBeTruthy();
    expect(thirdPlayerCard?.classList.contains(podiumStyles.hide ?? "")).toBe(true);
  });
});

describe("Podium three-dart average", () => {
  it("should show the backend three-dart average with two decimals under its accessible name", () => {
    const player: WinnerPlayerProps = {
      ...buildPlayer(1, "Anna", 0, 2, 60.6),
      rounds: [{}, {}],
    };

    render(<Podium userMap={[player]} list={[player]} />);

    const average = screen.getByRole("group", { name: "three-dart average" });
    expect(average.textContent).toBe("Ø AVG60.60");
  });

  it("should show a dash for the podium placeholder", () => {
    const placeholder: WinnerPlayerProps = {
      id: 0,
      name: "-",
      score: 0,
      isActive: false,
      index: 0,
      rounds: [{}],
    };

    render(<Podium userMap={[placeholder]} list={[]} />);

    expect(screen.getByRole("group", { name: "three-dart average" }).textContent).toBe("Ø AVG-");
  });

  it("should show a dash for a player with zero rounds and 0.00 for a player with rounds and an average of 0", () => {
    const idle = buildPlayer(1, "Idle", 0, 0, 0);
    const busted = buildPlayer(2, "Busted", 0, 3, 0);

    render(<Podium userMap={[idle, busted]} list={[idle, busted]} />);

    const [idleAverage, bustedAverage] = screen.getAllByRole("group", {
      name: "three-dart average",
    });
    expect(idleAverage?.textContent).toBe("Ø AVG-");
    expect(bustedAverage?.textContent).toBe("Ø AVG0.00");
  });
});
