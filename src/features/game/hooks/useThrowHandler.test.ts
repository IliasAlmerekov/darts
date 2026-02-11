import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { isThrowNotAllowedConflict } from "./useThrowHandler";

describe("isThrowNotAllowedConflict", () => {
  it("returns true for 409 GAME_THROW_NOT_ALLOWED", () => {
    const error = new ApiError("Request failed", {
      status: 409,
      data: {
        error: "GAME_THROW_NOT_ALLOWED",
        message: "Throw is not allowed in current game state.",
      },
    });

    expect(isThrowNotAllowedConflict(error)).toBe(true);
  });

  it("returns false for other api error codes", () => {
    const error = new ApiError("Request failed", {
      status: 409,
      data: {
        error: "SOME_OTHER_ERROR",
      },
    });

    expect(isThrowNotAllowedConflict(error)).toBe(false);
  });

  it("returns false for non-ApiError values", () => {
    expect(isThrowNotAllowedConflict(new Error("boom"))).toBe(false);
  });
});
