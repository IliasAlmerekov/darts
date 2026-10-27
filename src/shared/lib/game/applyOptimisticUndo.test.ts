// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBackendPlayer, buildGameThrowsResponse } from "@/shared/types/game.test-support";
import { applyOptimisticUndo } from "./applyOptimisticUndo";

const dart = { value: 20, isDouble: false, isTriple: false, isBust: false };

describe("placement after undo", () => {
  it.each(["current", "completed"])(
    "keeps the winner and finished status after a non-winning %s round throw",
    (round) => {
      const state = buildGameThrowsResponse({
        status: "finished",
        activePlayerId: 2,
        winnerId: 1,
        players: [
          buildBackendPlayer({ id: 1, score: 0, position: 1, placement: 1 }),
          buildBackendPlayer({
            id: 2,
            score: 80,
            position: 0,
            placement: 2,
            isActive: true,
            currentRoundThrows: round === "current" ? [dart] : [],
            throwsInCurrentRound: round === "current" ? 1 : 0,
            roundHistory: [{ round: 1, throws: [dart] }],
          }),
          buildBackendPlayer({ id: 3, score: 50, position: 2, placement: 3 }),
        ],
      });
      const result = applyOptimisticUndo(state);
      expect(result).toMatchObject({ status: "finished", winnerId: 1 });
      expect(
        result?.players.map(({ score, placement, position }) => ({ score, placement, position })),
      ).toEqual([
        { score: 0, placement: 1, position: 1 },
        { score: 100, placement: null, position: 0 },
        { score: 50, placement: null, position: 2 },
      ]);
      expect(state.players.map((player) => player.placement)).toEqual([1, 2, 3]);
    },
  );

  it.each(["current", "completed"])(
    "clears the winner after undoing their %s round checkout and leaves all turn positions unchanged",
    (round) => {
      const state = buildGameThrowsResponse({
        status: "finished",
        activePlayerId: 1,
        winnerId: 1,
        players: [
          buildBackendPlayer({
            id: 1,
            score: 0,
            position: 1,
            placement: 1,
            isActive: true,
            currentRoundThrows: round === "current" ? [dart] : [],
            throwsInCurrentRound: round === "current" ? 1 : 0,
            roundHistory: [{ round: 1, throws: [dart] }],
          }),
          buildBackendPlayer({ id: 2, score: 0, position: 0, placement: 2 }),
          buildBackendPlayer({ id: 3, score: 50, position: 2, placement: 3 }),
        ],
      });
      const result = applyOptimisticUndo(state);
      expect(result).toMatchObject({ status: "started", winnerId: null });
      expect(
        result?.players.map(({ score, placement, position }) => ({ score, placement, position })),
      ).toEqual([
        { score: 20, placement: null, position: 1 },
        { score: 0, placement: 2, position: 0 },
        { score: 50, placement: null, position: 2 },
      ]);
      expect(state.players.map((player) => player.placement)).toEqual([1, 2, 3]);
    },
  );
});
