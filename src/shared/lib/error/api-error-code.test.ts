import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api";
import { isApiErrorCode } from "./api-error-code";

function conflict(data: unknown, status = 409): ApiError {
  return new ApiError("Conflict", { status, data });
}

describe("isApiErrorCode", () => {
  it("should be true for a 409 ApiError whose payload carries the code", () => {
    expect(
      isApiErrorCode(conflict({ success: false, error: "GAME_ROOM_FULL" }), "GAME_ROOM_FULL"),
    ).toBe(true);
  });

  it("should be false for another code", () => {
    expect(isApiErrorCode(conflict({ error: "USERNAME_TAKEN" }), "GAME_ROOM_FULL")).toBe(false);
  });

  it("should be false for another status", () => {
    expect(isApiErrorCode(conflict({ error: "GAME_ROOM_FULL" }, 422), "GAME_ROOM_FULL")).toBe(
      false,
    );
  });

  it("should be false for a payload that is not an object", () => {
    expect(isApiErrorCode(conflict("GAME_ROOM_FULL"), "GAME_ROOM_FULL")).toBe(false);
    expect(isApiErrorCode(conflict(null), "GAME_ROOM_FULL")).toBe(false);
  });

  it("should be false for an error that is not an ApiError", () => {
    expect(isApiErrorCode(new Error("GAME_ROOM_FULL"), "GAME_ROOM_FULL")).toBe(false);
    expect(isApiErrorCode("GAME_ROOM_FULL", "GAME_ROOM_FULL")).toBe(false);
  });
});
