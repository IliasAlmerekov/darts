// @vitest-environment jsdom

const useSortableMock = vi.fn();
const setNodeRefMock = vi.fn();
const setActivatorNodeRefMock = vi.fn();

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => useSortableMock(),
}));

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildUserProps } from "@/shared/types/player.test-support";
import SelectedPlayerItem from "./SelectedPlayerItem";

describe("SelectedPlayerItem", () => {
  beforeEach(() => {
    setNodeRefMock.mockReset();
    setActivatorNodeRefMock.mockReset();
    useSortableMock.mockReturnValue({
      attributes: { "data-sortable-handle": "true" },
      listeners: { onPointerDown: vi.fn() },
      isDragging: false,
      setNodeRef: setNodeRefMock,
      setActivatorNodeRef: setActivatorNodeRefMock,
      transform: null,
      transition: undefined,
    });
  });

  it("wires the move button as the sortable activator", () => {
    render(
      <SelectedPlayerItem
        name="Alice"
        user={buildUserProps({ id: 1, name: "Alice" })}
        handleClick={() => {}}
        dragEnd={false}
      />,
    );

    const moveButton = screen.getByRole("button", { name: "Move player" });

    expect(moveButton.getAttribute("type")).toBe("button");
    expect(moveButton.getAttribute("data-sortable-handle")).toBe("true");
    expect(setActivatorNodeRefMock).toHaveBeenCalledWith(moveButton);
    expect(setNodeRefMock).toHaveBeenCalledTimes(1);
  });
});
