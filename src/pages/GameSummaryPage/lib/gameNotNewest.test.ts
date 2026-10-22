// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api";
import { isGameNotNewestError } from "./gameNotNewest";

describe("isGameNotNewestError", () => {
  it("should accept a 409 with the GAME_NOT_NEWEST code", () => {
    expect(
      isGameNotNewestError(
        new ApiError("Conflict", { status: 409, data: { error: "GAME_NOT_NEWEST" } }),
      ),
    ).toBe(true);
  });

  it.each([
    new ApiError("Conflict", { status: 409, data: { error: "GAME_REOPEN_NOT_ALLOWED" } }),
    new ApiError("Conflict", { status: 409, data: "GAME_NOT_NEWEST" }),
    new ApiError("Server error", { status: 500, data: { error: "GAME_NOT_NEWEST" } }),
    new Error("GAME_NOT_NEWEST"),
  ])("should reject any other error: %s", (error) => {
    expect(isGameNotNewestError(error)).toBe(false);
  });
});
