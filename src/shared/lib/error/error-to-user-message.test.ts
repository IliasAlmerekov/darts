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

  it("should use fallback message when error is unknown", () => {
    expect(toUserErrorMessage({})).toBe("Something went wrong. Please try again.");
    expect(toUserErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});
