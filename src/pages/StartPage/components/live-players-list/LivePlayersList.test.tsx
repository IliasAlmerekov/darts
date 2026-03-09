// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LivePlayersList } from "./LivePlayersList";

vi.mock("../player-items/SelectedPlayerItem", () => ({
  default: ({
    name,
    user,
    handleClick,
  }: {
    name: string;
    user: { id: number };
    handleClick: () => void;
  }) => (
    <button type="button" data-testid={`player-${user.id}`} onClick={handleClick}>
      {name}
    </button>
  ),
}));

describe("LivePlayersList", () => {
  it("renders players from props in playerOrder order and forwards removal", () => {
    const onRemovePlayer = vi.fn();

    render(
      <LivePlayersList
        players={[
          { id: 1, name: "Alex", position: 1 },
          { id: 2, name: "Sam", position: 0 },
        ]}
        playerCount={2}
        playerOrder={[1, 2]}
        onRemovePlayer={onRemovePlayer}
      />,
    );

    expect(screen.getByText("2/10")).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Alex",
      "Sam",
    ]);

    fireEvent.click(screen.getByTestId("player-2"));

    expect(onRemovePlayer).toHaveBeenCalledWith(2);
  });

  it("shows empty state when no players are provided", () => {
    render(<LivePlayersList players={[]} playerCount={0} />);

    expect(screen.getByText("No players yet. Scan the QR code to join!")).toBeTruthy();
  });
});
