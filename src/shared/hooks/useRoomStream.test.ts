import { describe, expect, it } from "vitest";
import { parseRoomStreamEventData } from "./useRoomStream";

describe("parseRoomStreamEventData (shared)", () => {
  it("parses valid json payload", () => {
    const parsed = parseRoomStreamEventData('{"gameId":1,"stateVersion":"v1"}');
    expect(parsed).toEqual({ gameId: 1, stateVersion: "v1" });
  });

  it("returns null for invalid json payload", () => {
    const parsed = parseRoomStreamEventData("{invalid-json");
    expect(parsed).toBeNull();
  });
});
