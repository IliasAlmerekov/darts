// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "@/shared/api";
import { toUserErrorMessage } from "./error-to-user-message";

describe("toUserErrorMessage", () => {
  it("should map network error message when request fails without connection", () => {
    expect(toUserErrorMessage(new NetworkError())).toBe(
      "Network error. Please check your connection and try again.",
    );
  });

  it("should map server error message when api responds with 500 status", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Internal Server Error", {
          status: 500,
        }),
      ),
    ).toBe("Server error. Please try again later.");
  });

  it("should map not found message when api responds with 404 status", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Not found", {
          status: 404,
        }),
      ),
    ).toBe("The requested resource was not found.");
  });

  it("should use payload message when api error has no known mapping", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Validation failed", {
          status: 422,
          data: { message: "Round is locked." },
        }),
      ),
    ).toBe("Round is locked.");
  });

  it("should map explicit user message when backend returns known rule code", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Conflict", {
          status: 409,
          data: { error: "GAME_START_SCORE_CHANGE_NOT_ALLOWED" },
        }),
      ),
    ).toBe("The start score cannot be changed for an existing game.");
  });

  it("should map the game not newest code to a message that the game is locked", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } }),
        "Could not start a rematch.",
      ),
    ).toBe("This game can no longer be changed.");
  });

  it("should map the game abort not allowed code to a message to reload the page", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Conflict", { status: 409, data: { error: "GAME_ABORT_NOT_ALLOWED" } }),
        "Could not leave the game. Please try again.",
      ),
    ).toBe("This game can no longer be left. Please reload the page.");
  });

  it("should map the game seats not editable code to a message that the game has started", () => {
    const message = toUserErrorMessage(
      new ApiError("Conflict", {
        status: 409,
        data: { success: false, error: "GAME_SEATS_NOT_EDITABLE", message: "Seats are locked." },
      }),
      "Could not remove player. Please try again.",
    );

    expect(message).toBe("This game has already started. The lobby can no longer be changed.");
    expect(message).not.toContain("GAME_SEATS_NOT_EDITABLE");
  });

  it("should map the game room full code to the lobby full message", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Conflict", {
          status: 409,
          data: { success: false, error: "GAME_ROOM_FULL", message: "Room is full." },
        }),
        "Could not add guest. Please try again.",
      ),
    ).toBe("The lobby is full. Remove a player to add another.");
  });

  it("should map the out rule lock code to a message that the out rule is locked", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Conflict", {
          status: 409,
          data: { error: "GAME_OUT_RULE_CHANGE_NOT_ALLOWED" },
        }),
        "Failed to update settings",
      ),
    ).toBe("The out rule cannot be changed once the game has a throw.");
  });

  it("should map the conflicting out rules code to a message that only one out rule fits", () => {
    expect(
      toUserErrorMessage(
        new ApiError("Unprocessable Entity", {
          status: 422,
          data: { error: "GAME_CONFLICTING_OUT_RULES" },
        }),
        "Failed to update settings",
      ),
    ).toBe("Double out and triple out cannot both be on. Choose one.");
  });

  it("should use fallback message when error is unknown", () => {
    expect(toUserErrorMessage({})).toBe("Something went wrong. Please try again.");
    expect(toUserErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});
