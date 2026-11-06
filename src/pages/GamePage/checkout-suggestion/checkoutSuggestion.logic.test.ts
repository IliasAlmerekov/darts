import { describe, expect, it } from "vitest";
import type { GameMode } from "@/types";
import { getCheckoutSuggestion } from "./checkoutSuggestion.logic";

const examples: [number, number, GameMode, string[] | null][] = [
  [60, 3, "single-out", ["T20"]],
  [20, 1, "single-out", ["20"]],
  [30, 1, "single-out", ["D15"]],
  [57, 1, "single-out", ["T19"]],
  [30, 3, "double-out", ["D15"]],
  [70, 2, "double-out", ["T10", "D20"]],
  [70, 3, "double-out", ["T10", "D20"]],
  [100, 3, "double-out", ["T20", "D20"]],
  [81, 3, "double-out", ["T15", "D18"]],
  [170, 3, "double-out", ["T20", "T20", "D25"]],
  [170, 2, "double-out", null],
  [169, 3, "double-out", null],
  [1, 3, "double-out", null],
  [30, 3, "triple-out", ["T10"]],
  [90, 2, "triple-out", ["T10", "T20"]],
  [2, 3, "triple-out", null],
];
describe("checkout suggestion", () => {
  it.each(examples)("scores %i with %i darts in %s", (score, darts, mode, route) => {
    expect(getCheckoutSuggestion(score, darts, mode)).toEqual(route);
  });
  it.each([
    [56, 3, "double-out", ["16", "D20"]],
    [46, 3, "double-out", ["6", "D20"]],
    [31, 2, "single-out", ["6", "25"]],
  ] satisfies typeof examples)("prefers singles at %i", (score, darts, mode, route) => {
    expect(getCheckoutSuggestion(score, darts, mode)).toEqual(route);
  });
  it("prefers fewer darts over a better final double", () => {
    expect(getCheckoutSuggestion(30, 3, "double-out")).toEqual(["D15"]);
  });
  it("prefers the ranked last double when route lengths tie", () => {
    expect(getCheckoutSuggestion(81, 3, "double-out")).toEqual(["T15", "D18"]);
  });
  it("uses all remaining darts for Plan B", () => {
    expect(getCheckoutSuggestion(56, 2, "single-out")).toEqual(["D18", "20"]);
    expect(getCheckoutSuggestion(56, 3, "single-out")).toEqual(["T12", "20"]);
  });
  it("compares earlier darts in order", () => {
    expect(getCheckoutSuggestion(103, 3, "single-out")).toEqual(["T20", "18", "25"]);
  });
  it("finds a shortest legal route for every score and dart count", () => {
    const segments = [
      ...Array.from({ length: 20 }, (_, i) => i + 1),
      25,
      ...Array.from({ length: 20 }, (_, i) => (i + 1) * 2),
      50,
      ...Array.from({ length: 20 }, (_, i) => (i + 1) * 3),
    ];
    for (const mode of ["single-out", "double-out", "triple-out"] as const) {
      const endings =
        mode === "single-out"
          ? segments
          : mode === "double-out"
            ? [...Array.from({ length: 20 }, (_, i) => (i + 1) * 2), 50]
            : Array.from({ length: 20 }, (_, i) => (i + 1) * 3);
      const reachable: Set<number>[] = [new Set(), new Set(endings)];
      for (let length = 2; length <= 3; length += 1) {
        const previous = reachable[length - 1] ?? new Set<number>();
        reachable.push(
          new Set(
            [...previous]
              .filter(
                (score) =>
                  !(mode !== "single-out" && score === 1) &&
                  !(mode === "triple-out" && score === 2),
              )
              .flatMap((score) => segments.map((points) => score + points)),
          ),
        );
      }
      for (let score = 1; score <= 180; score += 1)
        for (let darts = 1; darts <= 3; darts += 1) {
          const route = getCheckoutSuggestion(score, darts, mode);
          const shortest = [1, 2, 3].find(
            (length) => length <= darts && reachable[length]?.has(score),
          );
          expect(route?.length).toBe(shortest);
          if (!route) continue;
          let left = score;
          route.forEach((label, index) => {
            const ring = label.startsWith("D")
              ? "double"
              : label.startsWith("T")
                ? "triple"
                : "single";
            const number = Number(label.replace(/^[DT]/, ""));
            const points = number * (ring === "double" ? 2 : ring === "triple" ? 3 : 1);
            left -= points;
            if (index < route.length - 1) {
              expect(left).toBeGreaterThan(0);
              expect(mode !== "single-out" && left === 1).toBe(false);
              expect(mode === "triple-out" && left === 2).toBe(false);
              if (points <= 20 || points === 25) expect(ring).toBe("single");
            } else {
              expect(
                mode === "single-out" || ring === (mode === "double-out" ? "double" : "triple"),
              ).toBe(true);
            }
          });
          expect(left).toBe(0);
        }
    }
  }, 30000);
});
