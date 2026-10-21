// @vitest-environment jsdom
vi.mock("@/shared/api/room", () => ({
  updatePlayerOrder: vi.fn(),
}));

import { act, renderHook } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updatePlayerOrder } from "@/shared/api/room";
import { usePlayerOrderPersistence } from "./usePlayerOrderPersistence";

interface OrderedPlayer {
  id: number;
  position: number | null;
}

function renderOrder(players: OrderedPlayer[]) {
  return renderHook(
    ({ players: current }) =>
      usePlayerOrderPersistence({ gameId: 7, players: current, setPageError: vi.fn() }),
    { initialProps: { players } },
  );
}

function dragEnd(activeId: number, overId: number): DragEndEvent {
  return { active: { id: activeId }, over: { id: overId } } as unknown as DragEndEvent;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(updatePlayerOrder).mockResolvedValue(undefined);
});

describe("usePlayerOrderPersistence", () => {
  it("should order the players by position on the first render", () => {
    const { result } = renderOrder([
      { id: 2, position: 1 },
      { id: 3, position: null },
      { id: 1, position: 0 },
    ]);

    expect(result.current.playerOrder).toEqual([1, 2, 3]);
  });

  it("should keep a dragged order when a player joins and append the new player", () => {
    const { result, rerender } = renderOrder([
      { id: 1, position: 0 },
      { id: 2, position: 1 },
    ]);
    act(() => {
      result.current.handleDragEnd(dragEnd(2, 1));
    });

    rerender({
      players: [
        { id: 1, position: 0 },
        { id: 2, position: 1 },
        { id: 3, position: 2 },
      ],
    });

    expect(result.current.playerOrder).toEqual([2, 1, 3]);
  });

  it("should drop a player who left and clear the order when the lobby empties", () => {
    const { result, rerender } = renderOrder([
      { id: 1, position: 0 },
      { id: 2, position: 1 },
    ]);

    rerender({ players: [{ id: 2, position: 1 }] });
    expect(result.current.playerOrder).toEqual([2]);

    rerender({ players: [] });
    expect(result.current.playerOrder).toEqual([]);
  });
});
