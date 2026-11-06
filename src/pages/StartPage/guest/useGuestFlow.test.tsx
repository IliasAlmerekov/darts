// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api";
import type { AddGuestResult } from "../roster/useRoster";
import { useGuestFlow } from "./useGuestFlow";

const LOBBY_FULL_MESSAGE = "The lobby is full. Remove a player to add another.";

const addGuest = vi.fn<(username: string) => Promise<AddGuestResult>>();

function renderGuestFlow({
  gameId = 10,
  playerCount = 2,
}: { gameId?: number | null; playerCount?: number } = {}) {
  return renderHook(() => useGuestFlow({ gameId, playerCount, addGuest }));
}

async function typeAndAdd(
  result: ReturnType<typeof renderGuestFlow>["result"],
  username = "Alex",
): Promise<void> {
  act(() => {
    result.current.openGuestOverlay();
    result.current.setGuestUsername(username);
  });
  await act(async () => {
    await result.current.handleAddGuest();
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useGuestFlow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not open the overlay when the lobby is full", () => {
    const { result } = renderGuestFlow({ playerCount: 10 });

    act(() => result.current.openGuestOverlay());

    expect(result.current.isLobbyFull).toBe(true);
    expect(result.current.isGuestOverlayOpen).toBe(false);
    expect(result.current.guestError).toBe(LOBBY_FULL_MESSAGE);
  });

  it("asks for a game before adding a guest without one", async () => {
    const { result } = renderGuestFlow({ gameId: null });

    await typeAndAdd(result);

    expect(addGuest).not.toHaveBeenCalled();
    expect(result.current.guestError).toBe("Please create a game first.");
  });

  it("shows the validation error and does not add an invalid name", async () => {
    const { result } = renderGuestFlow();

    await typeAndAdd(result, "A1-");

    expect(addGuest).not.toHaveBeenCalled();
    expect(result.current.guestError).toBe("Username must contain at least 3 letters.");
  });

  it("does not add a second guest while the first request is in flight", async () => {
    const pending = deferred<AddGuestResult>();
    addGuest.mockReturnValueOnce(pending.promise);
    const { result } = renderGuestFlow();
    act(() => {
      result.current.openGuestOverlay();
      result.current.setGuestUsername("Alex");
    });

    let first = Promise.resolve();
    await act(async () => {
      first = result.current.handleAddGuest();
      void result.current.handleAddGuest();
    });
    expect(result.current.isAddingGuest).toBe(true);

    expect(addGuest).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ status: "added" });
      await first;
    });
    expect(result.current.isAddingGuest).toBe(false);
  });

  it("closes and clears the overlay once the guest is added", async () => {
    addGuest.mockResolvedValueOnce({ status: "added" });
    const { result } = renderGuestFlow();

    await typeAndAdd(result, "  Alex  ");

    expect(addGuest).toHaveBeenCalledExactlyOnceWith("Alex");
    expect(result.current.isGuestOverlayOpen).toBe(false);
    expect(result.current.guestUsername).toBe("");
    expect(result.current.guestError).toBeNull();
  });

  it("shows the readable message when the seats can no longer change", async () => {
    const error = new ApiError("Conflict", {
      status: 409,
      data: { success: false, error: "GAME_SEATS_NOT_EDITABLE" },
    });
    addGuest.mockResolvedValueOnce({ status: "seats-not-editable", error });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBe(
      "This game has already started. The lobby can no longer be changed.",
    );
    expect(result.current.guestSuggestions).toEqual([]);
    expect(result.current.isGuestOverlayOpen).toBe(true);
  });

  it("shows the lobby full message when the server reports a full lobby", async () => {
    const error = new ApiError("Conflict", {
      status: 409,
      data: { success: false, error: "GAME_ROOM_FULL", message: "Room is full." },
    });
    addGuest.mockResolvedValueOnce({ status: "lobby-full", error });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBe(LOBBY_FULL_MESSAGE);
    expect(result.current.guestSuggestions).toEqual([]);
    expect(result.current.isGuestOverlayOpen).toBe(true);
  });

  it("shows the server message and suggestions when the name is taken", async () => {
    addGuest.mockResolvedValueOnce({
      status: "username-taken",
      message: "That name is taken.",
      suggestions: ["Alex2", "Alex3"],
    });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBe("That name is taken.");
    expect(result.current.guestSuggestions).toEqual(["Alex2", "Alex3"]);
    expect(result.current.isGuestOverlayOpen).toBe(true);
  });

  it("falls back to the default message when a taken name comes without one", async () => {
    addGuest.mockResolvedValueOnce({ status: "username-taken", message: "", suggestions: [] });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBe("Username already taken in this game.");
    expect(result.current.guestSuggestions).toEqual([]);
  });

  it("shows the generic error when the add fails", async () => {
    addGuest.mockResolvedValueOnce({ status: "failed", error: new Error("network") });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBe("Could not add guest. Please try again.");
    expect(result.current.guestSuggestions).toEqual([]);
    expect(result.current.isGuestOverlayOpen).toBe(true);
  });

  it("sets no error for a stale answer", async () => {
    addGuest.mockResolvedValueOnce({ status: "stale", error: new Error("network") });
    const { result } = renderGuestFlow();

    await typeAndAdd(result);

    expect(result.current.guestError).toBeNull();
    expect(result.current.isGuestOverlayOpen).toBe(true);
    expect(result.current.isAddingGuest).toBe(false);
  });

  it("clears the error and suggestions when the name changes", async () => {
    addGuest.mockResolvedValueOnce({
      status: "username-taken",
      message: "Taken.",
      suggestions: ["Alex2"],
    });
    const { result } = renderGuestFlow();
    await typeAndAdd(result);
    expect(result.current.guestSuggestions).toEqual(["Alex2"]);

    act(() => result.current.setGuestUsername("Alexa"));

    expect(result.current.guestUsername).toBe("Alexa");
    expect(result.current.guestError).toBeNull();
    expect(result.current.guestSuggestions).toEqual([]);
  });

  it("fills the name with a picked suggestion", async () => {
    addGuest.mockResolvedValueOnce({
      status: "username-taken",
      message: "Taken.",
      suggestions: ["Alex2"],
    });
    const { result } = renderGuestFlow();
    await typeAndAdd(result);

    act(() => result.current.handleGuestSuggestion("Alex2"));

    expect(result.current.guestUsername).toBe("Alex2");
    expect(result.current.guestError).toBeNull();
    expect(result.current.guestSuggestions).toEqual([]);
  });
});
