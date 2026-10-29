// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mapInvitationErrorMessage } from "./invitation-error-message";

describe("mapInvitationErrorMessage", () => {
  it.each([
    ["GAME_ALREADY_STARTED", "This game has already started"],
    ["GAME_ROOM_FULL", "This game is full"],
    ["GAME_NOT_FOUND", "This game no longer exists"],
    ["GAME_JOIN_NOT_ALLOWED", "This game can no longer be joined"],
  ] as const)("maps %s to %s", (code, message) => {
    expect(mapInvitationErrorMessage(code)).toBe(message);
  });
});
