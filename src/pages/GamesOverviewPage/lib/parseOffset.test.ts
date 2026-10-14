// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseOffset } from "./parseOffset";

describe("parseOffset", () => {
  it("should read a whole, non-negative offset", () => {
    expect(parseOffset("18")).toBe(18);
  });

  it.each([null, "", "abc", "-9", "1.5"])("should read %s as the first page", (value) => {
    expect(parseOffset(value)).toBe(0);
  });
});
