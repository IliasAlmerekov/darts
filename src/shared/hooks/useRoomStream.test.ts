import { describe, expect, it } from "vitest";
import { parseRoomStreamEventData } from "./useRoomStream";

describe("parseRoomStreamEventData (shared)", () => {
  it("parses valid json payload", () => {
    const parsed = parseRoomStreamEventData('{"playerId":1,"action":"joined"}');
    expect(parsed).toEqual({ playerId: 1, action: "joined" });
  });

  it("returns null for invalid json payload", () => {
    const parsed = parseRoomStreamEventData("{invalid-json");
    expect(parsed).toBeNull();
  });
});
