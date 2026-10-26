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
