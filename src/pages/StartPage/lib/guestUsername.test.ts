import { describe, expect, it } from "vitest";
import { countLetters, validateGuestUsername } from "./guestUsername";

describe("guestUsername", () => {
  it("counts only letters", () => {
    expect(countLetters("A1-!б")).toBe(2);
  });

  it("returns error when empty", () => {
    expect(validateGuestUsername("  ")).toBe("Please enter a username.");
  });

  it("returns error when fewer than 3 letters", () => {
    expect(validateGuestUsername("A1-")).toBe("Username must contain at least 3 letters.");
  });

  it("accepts names with at least 3 letters and symbols", () => {
    expect(validateGuestUsername("Al#ex9")).toBeNull();
  });
});
