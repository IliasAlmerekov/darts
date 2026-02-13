import { describe, expect, it, vi } from "vitest";
import { persistPlayerOrder, shouldRedirectToCurrentGame } from "./useStartPage";

describe("shouldRedirectToCurrentGame", () => {
  it("returns true when route and invitation are missing but current game exists", () => {
    expect(shouldRedirectToCurrentGame(undefined, null, 42)).toBe(true);
  });

  it("returns false when route already contains game id", () => {
    expect(shouldRedirectToCurrentGame("42", null, 42)).toBe(false);
  });

  it("returns false when invitation already points to game", () => {
    expect(shouldRedirectToCurrentGame(undefined, 42, 42)).toBe(false);
  });

  it("returns false when current game id is missing", () => {
    expect(shouldRedirectToCurrentGame(undefined, null, null)).toBe(false);
  });
});

describe("persistPlayerOrder", () => {
  it("persists reordered positions on success", async () => {
    const updatePlayerOrder = vi.fn(async () => {});
    const onError = vi.fn();
    const onRollback = vi.fn();

    await persistPlayerOrder({
      gameId: 7,
      nextOrder: [20, 10, 30],
      previousOrder: [10, 20, 30],
      updatePlayerOrder,
      onError,
      onRollback,
      shouldRollback: () => true,
    });

    expect(updatePlayerOrder).toHaveBeenCalledWith(7, [
      { playerId: 20, position: 0 },
      { playerId: 10, position: 1 },
      { playerId: 30, position: 2 },
    ]);
    expect(onError).not.toHaveBeenCalled();
    expect(onRollback).not.toHaveBeenCalled();
  });

  it("rolls back when request fails and rollback is still relevant", async () => {
    const updatePlayerOrder = vi.fn(async () => {
      throw new Error("network");
    });
    const onError = vi.fn();
    const onRollback = vi.fn();

    await persistPlayerOrder({
      gameId: 7,
      nextOrder: [20, 10, 30],
      previousOrder: [10, 20, 30],
      updatePlayerOrder,
      onError,
      onRollback,
      shouldRollback: () => true,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onRollback).toHaveBeenCalledWith([10, 20, 30]);
  });

  it("does not roll back stale request failure", async () => {
    const updatePlayerOrder = vi.fn(async () => {
      throw new Error("network");
    });
    const onError = vi.fn();
    const onRollback = vi.fn();

    await persistPlayerOrder({
      gameId: 7,
      nextOrder: [20, 10, 30],
      previousOrder: [10, 20, 30],
      updatePlayerOrder,
      onError,
      onRollback,
      shouldRollback: () => false,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onRollback).not.toHaveBeenCalled();
  });
});
