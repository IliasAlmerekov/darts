import { describe, expect, it } from "vitest";
import { parseRoomStreamEventData } from "./useRoomStream";

describe("parseRoomStreamEventData (room feature)", () => {
  it("parses valid json payload", () => {
    const parsed = parseRoomStreamEventData('{"type":"throw","value":20}');
    expect(parsed).toEqual({ type: "throw", value: 20 });
  });

  it("returns null for invalid json payload", () => {
    const parsed = parseRoomStreamEventData("not-json");
    expect(parsed).toBeNull();
  });
});
