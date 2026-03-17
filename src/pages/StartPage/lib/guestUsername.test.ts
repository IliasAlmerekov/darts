// @vitest-environment node
import { describe, expect, it } from "vitest";
import { countLetters, validateGuestUsername } from "./guestUsername";

describe("guestUsername", () => {
  it("should count only letters when input contains non-letter characters", () => {
    expect(countLetters("A1-!б")).toBe(2);
  });

  it("should return error when empty", () => {
    expect(validateGuestUsername("  ")).toBe("Please enter a username.");
  });

  it("should return error when fewer than 3 letters are present", () => {
    expect(validateGuestUsername("A1-")).toBe("Username must contain at least 3 letters.");
  });

  it("should accept names when they contain at least 3 letters and other characters", () => {
    expect(validateGuestUsername("Al#ex9")).toBeNull();
  });
});
