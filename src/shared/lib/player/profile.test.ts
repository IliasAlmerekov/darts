// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  buildPlayerProfile as buildProfile,
  buildPlayerProfileGame as buildGame,
  buildPlayerProfileStats as buildStats,
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
  it("formats the stats with two decimals for the average and whole-number rates", () => {
    expect(toPlayerProfile(buildProfile()).stats).toEqual({
      gamesPlayed: "18",
      scoreAverage: "56.40",
      wins: "7",
      winRate: "39%",
      checkoutRate: "32%",
      checkouts: "7 / 22",
    });
  });

  it("formats a three-dart average of 60.6 as 60.60", () => {
    const { stats } = toPlayerProfile(buildProfile({ stats: buildStats({ scoreAverage: 60.6 }) }));

    expect(stats.scoreAverage).toBe("60.60");
  });

  it("rounds one-decimal API rates down as well as up", () => {
    const { stats, mostHitSegment, favoriteDoubles } = toPlayerProfile(
      buildProfile({
        stats: buildStats({
          winRate: 38.2,
          checkoutRate: 0.4,
          mostHitSegment: { segment: "20", hits: 96, share: 15.5 },
          favoriteDoubles: [{ double: "D20", hits: 8, attempts: 19, hitRate: 42.1 }],
        }),
      }),
    );

    expect([stats.winRate, stats.checkoutRate, mostHitSegment?.share]).toEqual([
      "38%",
      "0%",
      "16%",
    ]);
    expect(favoriteDoubles).toEqual([{ double: "D20", hitRate: "42%", checkouts: "8 / 19" }]);
  });

  it("shows a dash for a missing win rate and checkout rate and keeps the counts", () => {
    const { stats } = toPlayerProfile(
      buildProfile({
        stats: buildStats({
          wins: 0,
          winRate: null,
          checkoutRate: null,
          checkoutHits: 0,
          checkoutAttempts: 0,
        }),
      }),
    );

    expect(stats).toMatchObject({ wins: "0", winRate: "–", checkoutRate: "–", checkouts: "0 / 0" });
  });

  it("names Bull, Bullseye and Miss in words and keeps S, D and T darts as sent", () => {
    const { highestFinish, favoriteDoubles, mostHitSegment } = toPlayerProfile(
      buildProfile({
        stats: buildStats({
          highestFinish: { score: 100, darts: 3, throws: ["BULL", "MISS", "BULLSEYE"] },
          favoriteDoubles: [
            { double: "BULLSEYE", hits: 3, attempts: 9, hitRate: 33.3 },
            { double: "D16", hits: 2, attempts: 4, hitRate: 50 },
          ],
          mostHitSegment: { segment: "BULL", hits: 40, share: 9.1 },
        }),
      }),
    );

    expect(highestFinish?.throws.map((dart) => dart.label)).toEqual(["Bull", "Miss", "Bullseye"]);
    expect(favoriteDoubles.map((double) => double.double)).toEqual(["Bullseye", "D16"]);
    expect(mostHitSegment).toEqual({ segment: "Bull", name: "Bull", share: "9%" });
  });

  it("names a numbered most hit segment as a segment", () => {
    expect(toPlayerProfile(buildProfile()).mostHitSegment).toEqual({
      segment: "20",
      name: "segment 20",
      share: "7%",
    });
  });

  it("counts the darts of the highest finish, one dart in the singular", () => {
    const finish = (darts: number): string | undefined =>
      toPlayerProfile(
        buildProfile({
          stats: buildStats({
            highestFinish: { score: 50, darts, throws: ["BULLSEYE", "D20", "T20"].slice(0, darts) },
          }),
        }),
      ).highestFinish?.darts;

    expect([finish(1), finish(3)]).toEqual(["in 1 dart", "in 3 darts"]);
    expect(toPlayerProfile(buildProfile()).highestFinish).toEqual({
      score: "121",
      darts: "in 3 darts",
      throws: [
        { key: "dart-1", label: "T20" },
        { key: "dart-2", label: "S11" },
        { key: "dart-3", label: "Bullseye" },
      ],
    });
  });

  it("has no favorite doubles, highest finish or most hit segment without them", () => {
    const profile = toPlayerProfile(
      buildProfile({
        stats: buildStats({ favoriteDoubles: [], highestFinish: null, mostHitSegment: null }),
      }),
    );

    expect([profile.favoriteDoubles, profile.highestFinish, profile.mostHitSegment]).toEqual([
      [],
      null,
      null,
    ]);
  });

  it("passes the hit distribution on as the API sends it", () => {
    const stats = buildStats();

    expect(toPlayerProfile(buildProfile({ stats })).hitDistribution).toEqual(stats.hitDistribution);
  });

  it("shows a dash for a missing average", () => {
    expect(
      toPlayerProfile(buildProfile({ stats: buildStats({ gamesPlayed: 0, scoreAverage: null }) }))
        .stats.scoreAverage,
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
      "20 Oct 2026, 18:42 · 2nd of 4",
      "19 Oct 2026, 09:05 · 1st of 2",
    ]);
    expect(profile.history.map((row) => row.average)).toEqual(["45.25", "60.00"]);
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

    expect(row?.summary).toBe("– of 2");
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
      "11th of 30",
      "12th of 30",
      "13th of 30",
      "21st of 30",
      "22nd of 30",
      "23rd of 30",
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
      {
        gameId: 1,
        roundAverage: 30,
        date: "20 Oct 2026, 18:42",
        average: "30.00",
        label: "20 Oct 2026, 18:42 · Ø AVG 30.00",
      },
      { gameId: 2, roundAverage: 40, date: null, average: "40.00", label: "Ø AVG 40.00" },
      {
        gameId: 3,
        roundAverage: 50,
        date: "20 Oct 2026, 18:42",
        average: "50.00",
        label: "20 Oct 2026, 18:42 · Ø AVG 50.00",
      },
    ]);
  });

  it("shows the Registration month in the timestamp's own offset, not the browser's", () => {
    // The process runs in UTC, where this instant is still 28 Feb 2026.
    expect(
      toPlayerProfile(buildProfile({ registeredAt: "2026-03-01T00:00:00+02:00" })).memberSince,
    ).toBe("Mar 2026");
  });

  it.each([
    null,
    undefined,
    "not a date",
    "2026-13-01T00:00:00+02:00",
    "2026-04-31T00:00:00+02:00",
    "2025-02-29T00:00:00+01:00",
  ])("has no Registration month for registeredAt %s", (registeredAt) => {
    expect(toPlayerProfile(buildProfile({ registeredAt })).memberSince).toBeNull();
  });

  it("shows the Registration month for a leap day", () => {
    expect(
      toPlayerProfile(buildProfile({ registeredAt: "2024-02-29T12:00:00+01:00" })).memberSince,
    ).toBe("Feb 2024");
  });

  it.each(["2026-02-01T10:00:00+02", "2026-02-01T10:00:00 +02:00"])(
    "shows the Registration month for registeredAt %s, which the schema accepts and Date does not",
    (registeredAt) => {
      expect(toPlayerProfile(buildProfile({ registeredAt })).memberSince).toBe("Feb 2026");
    },
  );

  it("returns no rows and no trend for a player without finished games", () => {
    const profile = toPlayerProfile(buildProfile({ recentGames: [] }));

    expect(profile.history).toEqual([]);
    expect(profile.scoringTrend).toEqual([]);
  });
});
