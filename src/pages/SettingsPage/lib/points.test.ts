// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isStartScore } from "./points";

describe("isStartScore", () => {
  it("accepts only the offered start scores", () => {
    expect(isStartScore(501)).toBe(true);
    expect(isStartScore("501")).toBe(false);
    expect(isStartScore(999)).toBe(false);
  });
});
