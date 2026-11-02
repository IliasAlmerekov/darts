import type { GameMode } from "@/types";
import { allowsCheckoutWith, isDeadScore, type Ring } from "./outRule.logic";

interface Segment {
  ring: Ring;
  number: number;
  points: number;
}
const segments: Segment[] = (["single", "double", "triple"] as const).flatMap((ring) =>
  Array.from({ length: ring === "triple" ? 20 : 21 }, (_, index) => {
    const number = index === 20 ? 25 : index + 1;
    return { ring, number, points: number * (ring === "single" ? 1 : ring === "double" ? 2 : 3) };
  }),
);
const cache = new Map<string, string[] | null>();
const doubleOrder = [20, 16, 8, 18, 12, 10, 25];

function routes(score: number, length: number, mode: GameMode): Segment[][] {
  if (length === 1)
    return segments
      .filter((s) => s.points === score && allowsCheckoutWith(s.ring, mode))
      .map((s) => [s]);
  return segments.flatMap((s) => {
    const next = score - s.points;
    return next <= 0 || isDeadScore(next, mode)
      ? []
      : routes(next, length - 1, mode).map((tail) => [s, ...tail]);
  });
}
function lastRank(s: Segment, mode: GameMode): number {
  if (mode === "double-out") {
    const index = doubleOrder.indexOf(s.number);
    return index < 0 ? 7 + 20 - s.number : index;
  }
  if (mode === "triple-out") return 20 - s.number;
  return (s.ring === "single" ? 0 : s.ring === "double" ? 100 : 200) - s.number;
}
function earlierRank(s: Segment): number {
  if (s.ring === "triple" && s.number === 20) return -1000;
  if (s.ring === "triple" && s.number === 19) return -999;
  return -s.points * 3 + (s.ring === "single" ? 0 : s.ring === "triple" ? 1 : 2);
}
function hasPlanB(route: Segment[], score: number, dartsLeft: number, mode: GameMode): boolean {
  const first = route[0];
  if (!first || first.ring === "single" || dartsLeft === 1) return true;
  const next = score - first.number;
  if (next <= 0 || isDeadScore(next, mode)) return false;
  return Array.from({ length: dartsLeft - 1 }, (_, i) => i + 1).some(
    (length) => routes(next, length, mode).length > 0,
  );
}
export function getCheckoutSuggestion(
  remaining: number,
  dartsLeft: number,
  mode: GameMode,
): string[] | null {
  const key = `${mode}:${remaining}:${dartsLeft}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (
    !Number.isInteger(remaining) ||
    remaining < 1 ||
    remaining > 180 ||
    !Number.isInteger(dartsLeft) ||
    dartsLeft < 1 ||
    dartsLeft > 3
  )
    return null;
  for (let length = 1; length <= dartsLeft; length += 1) {
    const candidates = routes(remaining, length, mode);
    if (candidates.length === 0) continue;
    const compareLastDart = (a: Segment[], b: Segment[]): number =>
      lastRank(a[a.length - 1]!, mode) - lastRank(b[b.length - 1]!, mode);
    const comparePlanB = (a: Segment[], b: Segment[]): number =>
      Number(hasPlanB(b, remaining, dartsLeft, mode)) -
      Number(hasPlanB(a, remaining, dartsLeft, mode));
    const compareEarlierDarts = (a: Segment[], b: Segment[]): number => {
      for (let i = 0; i < a.length - 1; i += 1) {
        const difference = earlierRank(a[i]!) - earlierRank(b[i]!);
        if (difference !== 0) return difference;
      }
      return 0;
    };
    const comparators = [compareLastDart, comparePlanB, compareEarlierDarts];
    candidates.sort((a, b) => {
      for (const compare of comparators) {
        const difference = compare(a, b);
        if (difference !== 0) return difference;
      }
      return 0;
    });
    const result = candidates[0]!.map(
      (s) => `${s.ring === "single" ? "" : s.ring === "double" ? "D" : "T"}${s.number}`,
    );
    cache.set(key, result);
    return result;
  }
  cache.set(key, null);
  return null;
}
