// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api";
import { isGameAbortNotAllowedError } from "./gameAbortNotAllowed";

describe("isGameAbortNotAllowedError", () => {
  it("should accept a 409 with the GAME_ABORT_NOT_ALLOWED code", () => {
    expect(
      isGameAbortNotAllowedError(
        new ApiError("Conflict", { status: 409, data: { error: "GAME_ABORT_NOT_ALLOWED" } }),
      ),
    ).toBe(true);
  });

  it.each([
    new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } }),
    new ApiError("Conflict", { status: 409, data: "GAME_ABORT_NOT_ALLOWED" }),
    new ApiError("Server error", { status: 500, data: { error: "GAME_ABORT_NOT_ALLOWED" } }),
    new Error("GAME_ABORT_NOT_ALLOWED"),
  ])("should reject any other error: %s", (error) => {
    expect(isGameAbortNotAllowedError(error)).toBe(false);
  });
});
