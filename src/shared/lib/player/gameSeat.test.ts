// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toSeatOutcome } from "./gameSeat";

describe("toSeatOutcome", () => {
  it.each(["lobby", "started"] as const)("reads a seat held in a game in %s", (status) => {
    expect(toSeatOutcome({ gameId: 12, status, seated: true })).toBe("seated");
  });

  it.each(["lobby", "started"] as const)("reads a seat lost in a game in %s", (status) => {
    expect(toSeatOutcome({ gameId: 12, status, seated: false })).toBe("removed");
  });

  it.each([
    { status: "finished", seated: true },
    { status: "finished", seated: false },
    { status: "aborted", seated: true },
    { status: "aborted", seated: false },
  ] as const)("reads a game that is over when it is $status, seated $seated", (answer) => {
    expect(toSeatOutcome({ gameId: 12, ...answer })).toBe("over");
  });
});
