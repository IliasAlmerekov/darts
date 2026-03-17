// @vitest-environment jsdom

import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { buildBackendPlayer } from "@/shared/types/game.test-support";
import { LivePlayersList } from "./LivePlayersList";

function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <DndContext>
      <SortableContext items={[]}>{children}</SortableContext>
    </DndContext>
  );
}

describe("LivePlayersList", () => {
  it("renders players from props in playerOrder order and forwards removal", () => {
    const onRemovePlayer = vi.fn();

    render(
      <Wrapper>
        <LivePlayersList
          players={[
            buildBackendPlayer({ id: 1, name: "Alex", position: 1 }),
            buildBackendPlayer({ id: 2, name: "Sam", position: 0 }),
          ]}
          playerCount={2}
          playerOrder={[1, 2]}
          onRemovePlayer={onRemovePlayer}
        />
      </Wrapper>,
    );

    expect(screen.getByText("2/10")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();

    // playerOrder [1, 2] → Alex (id=1) is first, Sam (id=2) is second
    const deleteButtons = screen.getAllByRole("button", { name: "Delete player" });
    const samDeleteButton = deleteButtons.at(1);
    expect(samDeleteButton).toBeTruthy();
    if (samDeleteButton) {
      fireEvent.click(samDeleteButton);
    }

    expect(onRemovePlayer).toHaveBeenCalledWith(2);
  });

  it("shows empty state when no players are provided", () => {
    render(
      <Wrapper>
        <LivePlayersList players={[]} playerCount={0} />
      </Wrapper>,
    );

    expect(screen.getByText("No players yet. Scan the QR code to join!")).toBeTruthy();
  });
});
