// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  buildPlayerProfile as buildProfile,
  buildPlayerProfileGame as buildGame,
} from "@/shared/types/player.test-support";
import { toPlayerProfile } from "./profile";

// Dates show in the browser's time zone; the formatter reads it when the module loads.
vi.hoisted(() => {
  process.env.TZ = "UTC";
});

const FOUR_PLAYER_GAME = {
  participantsCount: 4,
  participants: [
    { playerId: 7, displayName: "Anna", placement: 1, isSelf: false },
    { playerId: 42, displayName: "test2", placement: 2, isSelf: true },
    { playerId: null, displayName: "Guest", placement: 3, isSelf: false },
    { playerId: 9, displayName: "Ben", placement: 4, isSelf: false },
  ],
};

describe("toPlayerProfile", () => {
  it("formats the stats with two decimals for the average", () => {
    expect(toPlayerProfile(buildProfile()).stats).toEqual({
      gamesPlayed: "18",
      scoreAverage: "56.40",
    });
  });

  it("shows a dash for a missing average", () => {
    expect(
      toPlayerProfile(buildProfile({ stats: { gamesPlayed: 0, scoreAverage: null } })).stats
        .scoreAverage,
    ).toBe("–");
  });

  it("builds one history row per game in API order with date, placement and average", () => {
    const profile = toPlayerProfile(
      buildProfile({
        recentGames: [
          buildGame(FOUR_PLAYER_GAME),
          buildGame({
            gameId: 30,
            finishedAt: "2026-10-19T09:05:00+00:00",
            placement: 1,
            roundAverage: 60,
            participantsCount: 2,
          }),
        ],
      }),
    );

    expect(profile.history.map((row) => row.summary)).toEqual([
      "20 Oct 2026, 18:42 · 2nd of 4 · Avg 45.3",
      "19 Oct 2026, 09:05 · 1st of 2 · Avg 60.0",
    ]);
  });

  it("lists every participant in order and marks the player's own entry", () => {
    const [row] = toPlayerProfile(
      buildProfile({ recentGames: [buildGame(FOUR_PLAYER_GAME)] }),
    ).history;

    expect(row?.participants.map((participant) => participant.label)).toEqual([
      "1. Anna",
      "2. test2 (you)",
      "3. Guest",
      "4. Ben",
    ]);
  });

  it("leaves out a missing date and shows dashes and Unknown for missing values", () => {
    const [row] = toPlayerProfile(
      buildProfile({
        recentGames: [
          buildGame({
            finishedAt: null,
            placement: null,
            participantsCount: 2,
            participants: [
              { playerId: null, displayName: null, placement: null, isSelf: false },
              { playerId: 42, displayName: "test2", placement: null, isSelf: true },
            ],
          }),
        ],
      }),
    ).history;

    expect(row?.summary).toBe("– of 2 · Avg 45.3");
    expect(row?.participants.map((participant) => participant.label)).toEqual([
      "– Unknown",
      "– test2 (you)",
    ]);
  });

  it("uses 11th, 12th and 13th, and 21st, 22nd and 23rd", () => {
    const summaries = [11, 12, 13, 21, 22, 23].map(
      (placement) =>
        toPlayerProfile(
          buildProfile({
            recentGames: [buildGame({ finishedAt: null, placement, participantsCount: 30 })],
          }),
        ).history[0]?.summary,
    );

    expect(summaries).toEqual([
      "11th of 30 · Avg 45.3",
      "12th of 30 · Avg 45.3",
      "13th of 30 · Avg 45.3",
      "21st of 30 · Avg 45.3",
      "22nd of 30 · Avg 45.3",
      "23rd of 30 · Avg 45.3",
    ]);
  });

  it("puts the scoring trend in oldest-first order, one point per game", () => {
    const profile = toPlayerProfile(
      buildProfile({
        recentGames: [
          buildGame({ gameId: 3, roundAverage: 50 }),
          buildGame({ gameId: 2, roundAverage: 40, finishedAt: null }),
          buildGame({ gameId: 1, roundAverage: 30 }),
        ],
      }),
    );

    expect(profile.scoringTrend).toEqual([
      { gameId: 1, roundAverage: 30, label: "20 Oct 2026, 18:42 · Avg 30.0" },
      { gameId: 2, roundAverage: 40, label: "Avg 40.0" },
      { gameId: 3, roundAverage: 50, label: "20 Oct 2026, 18:42 · Avg 50.0" },
    ]);
  });

  it("returns no rows and no trend for a player without finished games", () => {
    const profile = toPlayerProfile(buildProfile({ recentGames: [] }));

    expect(profile.history).toEqual([]);
    expect(profile.scoringTrend).toEqual([]);
  });
});
