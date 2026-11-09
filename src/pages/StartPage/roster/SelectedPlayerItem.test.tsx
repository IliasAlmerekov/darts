// @vitest-environment jsdom

const useSortableMock = vi.fn();
const setNodeRefMock = vi.fn();
const setActivatorNodeRefMock = vi.fn();

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => useSortableMock(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildUserProps } from "@/shared/types/player.test-support";
import SelectedPlayerItem from "./SelectedPlayerItem";

function renderItem(): void {
  render(
    <SelectedPlayerItem
      name="Alice"
      user={buildUserProps({ id: 1, name: "Alice" })}
      handleClick={() => {}}
      dragEnd={false}
    />,
  );
}

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

  it("stops the move icon from being dragged as a native image", () => {
    renderItem();

    const moveIcon = screen.getByRole("img", { name: "Move icon" });

    expect(moveIcon.getAttribute("draggable")).toBe("false");
  });

  it("stops the delete icon from being dragged as a native image", () => {
    renderItem();

    const deleteIcon = screen.getByRole("img", { name: "Delete" });

    expect(deleteIcon.getAttribute("draggable")).toBe("false");
  });

  it("cancels the context menu on the move button", () => {
    renderItem();

    const moveButton = screen.getByRole("button", { name: "Move player" });
    const notCancelled = fireEvent.contextMenu(moveButton);

    expect(notCancelled).toBe(false);
  });

  it("keeps the sortable listeners when it cancels the context menu", () => {
    const onPointerDown = vi.fn();
    const onContextMenu = vi.fn();
    useSortableMock.mockReturnValue({
      ...useSortableMock(),
      listeners: { onPointerDown, onContextMenu },
    });
    renderItem();

    const moveButton = screen.getByRole("button", { name: "Move player" });
    fireEvent.pointerDown(moveButton);
    const notCancelled = fireEvent.contextMenu(moveButton);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    expect(notCancelled).toBe(false);
  });
});
