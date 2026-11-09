import type {
  PlayerProfileGame,
  PlayerProfileResponse,
  PlayerPublicProfileResponse,
} from "@/shared/api/player";

const MISSING_VALUE = "–";
const UNKNOWN_NAME = "Unknown";

interface ProfileParticipant {
  key: string;
  label: string;
  /** The id whose Public profile the name opens; null for a guest and for the player. */
  publicProfileId: number | null;
}

interface ProfileHistoryRow {
  gameId: number;
  summary: string;
  /** The game's three-dart average with two decimals, such as `45.30`. */
  average: string;
  participants: ProfileParticipant[];
}

export interface ScoringTrendPoint {
  gameId: number;
  roundAverage: number;
  /** The finish date, or null when the game has none. */
  date: string | null;
  /** The game's three-dart average with two decimals. */
  average: string;
  /** Date and average as one plain text, for the chart's point titles. */
  label: string;
}

type ProfileStats = PlayerProfileResponse["stats"];

interface FavoriteDouble {
  double: string;
  hitRate: string;
  /** Checkouts on the double over the darts thrown at it, such as `4 / 11`. */
  checkouts: string;
}

interface FinishDart {
  key: string;
  label: string;
}

/** The games a hit distribution counts: all of them, or those of one out rule. */
export type HitDistributionFilter = "all" | keyof ProfileStats["hitDistributionByOutRule"];

/** The statistics of a Profile, as the own Player profile and a Public profile show them. */
export interface ProfileStatistics {
  stats: {
    gamesPlayed: string;
    scoreAverage: string;
    wins: string;
    winRate: string;
    checkoutRate: string;
    /** Checkout hits over attempts, such as `7 / 22`. */
    checkouts: string;
  };
  /** Hits per board field, `S1` to `T20`, `BULL` and `BULLSEYE`, for all games and for each out rule. */
  hitDistributions: Record<HitDistributionFilter, ProfileStats["hitDistribution"]>;
  /** `name` reads in a sentence: `segment 20`, or `Bull`. */
  mostHitSegment: { segment: string; name: string; share: string } | null;
  favoriteDoubles: FavoriteDouble[];
  highestFinish: { score: string; darts: string; throws: FinishDart[] } | null;
}

/** The Player profile as the page shows it. */
export interface PlayerProfile extends ProfileStatistics {
  history: ProfileHistoryRow[];
  scoringTrend: ScoringTrendPoint[];
  /** The Registration month, such as `Feb 2026`, or null without a valid Registration date. */
  memberSince: string | null;
}

/** Another player's Public profile: name and statistics, without recent games. */
export interface PublicProfile extends ProfileStatistics {
  playerId: number;
  displayName: string;
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const monthYearFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const ordinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
const ORDINAL_SUFFIXES: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: "st",
  two: "nd",
  few: "rd",
};

/** `20 Oct 2026, 18:42` in the browser's time zone, or null without a valid date. */
function formatFinishedAt(finishedAt: string | null | undefined): string | null {
  if (finishedAt === null || finishedAt === undefined) {
    return null;
  }
  const date = new Date(finishedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

/**
 * `Feb 2026` from the timestamp's own `YYYY-MM`, so every viewer sees the month the server
 * wrote, whatever the browser's time zone. Null without a valid date, including month 13 or
 * a day the month lacks such as 31 April, which `Date` would roll into the next month. The
 * full value is not parsed with `Date`, which rejects offsets the schema accepts, such as `+02`.
 */
function formatRegistrationMonth(registeredAt: string | null | undefined): string | null {
  if (registeredAt === null || registeredAt === undefined) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(registeredAt);
  if (match === null) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return monthYearFormat.format(Date.UTC(year, month));
}

const DART_LABELS: Partial<Record<string, string>> = {
  BULL: "Bull",
  BULLSEYE: "Bullseye",
  MISS: "Miss",
};

/** `Bull`, `Bullseye` and `Miss` in words; `S20`, `D16`, `T20` and segment numbers as sent. */
function formatDart(dart: string): string {
  return DART_LABELS[dart] ?? dart;
}

/** A 0 to 100 API rate as a whole number, such as `38%`. */
function formatPercent(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? MISSING_VALUE : `${Math.round(rate)}%`;
}

function formatOrdinal(placement: number): string {
  return `${placement}${ORDINAL_SUFFIXES[ordinalRules.select(placement)] ?? "th"}`;
}

function formatThreeDartAverage(roundAverage: number): string {
  return roundAverage.toFixed(2);
}

function joinParts(parts: (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(" · ");
}

function toHistoryRow(game: PlayerProfileGame): ProfileHistoryRow {
  const placement =
    game.placement === null || game.placement === undefined
      ? MISSING_VALUE
      : formatOrdinal(game.placement);

  return {
    gameId: game.gameId,
    summary: joinParts([
      formatFinishedAt(game.finishedAt),
      `${placement} of ${game.participantsCount}`,
    ]),
    average: formatThreeDartAverage(game.roundAverage),
    participants: game.participants.map((participant, index) => {
      const position =
        participant.placement === null || participant.placement === undefined
          ? MISSING_VALUE
          : `${participant.placement}.`;
      const name = participant.displayName ?? UNKNOWN_NAME;
      const playerId = participant.playerId ?? null;
      return {
        // A Guest has no player id; its position in the finished game never changes.
        key: playerId === null ? `guest-${index}` : `player-${playerId}`,
        label: `${position} ${name}${participant.isSelf ? " (you)" : ""}`,
        publicProfileId: participant.isSelf ? null : playerId,
      };
    }),
  };
}

function toScoringTrendPoint(game: PlayerProfileGame): ScoringTrendPoint {
  const date = formatFinishedAt(game.finishedAt);
  const average = formatThreeDartAverage(game.roundAverage);
  return {
    gameId: game.gameId,
    roundAverage: game.roundAverage,
    date,
    average,
    label: joinParts([date, `Ø AVG ${average}`]),
  };
}

/** Formats the stats both profile answers share. */
function toProfileStatistics(stats: ProfileStats): ProfileStatistics {
  const { scoreAverage, mostHitSegment, highestFinish } = stats;

  return {
    stats: {
      gamesPlayed: String(stats.gamesPlayed),
      scoreAverage:
        scoreAverage === null || scoreAverage === undefined
          ? MISSING_VALUE
          : scoreAverage.toFixed(2),
      wins: String(stats.wins),
      winRate: formatPercent(stats.winRate),
      checkoutRate: formatPercent(stats.checkoutRate),
      checkouts: `${stats.checkoutHits} / ${stats.checkoutAttempts}`,
    },
    hitDistributions: { all: stats.hitDistribution, ...stats.hitDistributionByOutRule },
    mostHitSegment:
      mostHitSegment === null || mostHitSegment === undefined
        ? null
        : {
            segment: formatDart(mostHitSegment.segment),
            name: DART_LABELS[mostHitSegment.segment] ?? `segment ${mostHitSegment.segment}`,
            share: formatPercent(mostHitSegment.share),
          },
    favoriteDoubles: stats.favoriteDoubles.map((double) => ({
      double: formatDart(double.double),
      hitRate: formatPercent(double.hitRate),
      checkouts: `${double.hits} / ${double.attempts}`,
    })),
    highestFinish:
      highestFinish === null || highestFinish === undefined
        ? null
        : {
            score: String(highestFinish.score),
            darts: `in ${highestFinish.darts} ${highestFinish.darts === 1 ? "dart" : "darts"}`,
            throws: highestFinish.throws.map((dart, index) => ({
              // The same dart can repeat, such as T20, T20; its place in the finish never changes.
              key: `dart-${index + 1}`,
              label: formatDart(dart),
            })),
          },
  };
}

/**
 * Reads the profile answer. Recent games arrive newest first: history keeps that order,
 * and the scoring trend runs oldest first, left to right.
 */
export function toPlayerProfile(response: PlayerProfileResponse): PlayerProfile {
  return {
    ...toProfileStatistics(response.stats),
    history: response.recentGames.map(toHistoryRow),
    scoringTrend: response.recentGames.map(toScoringTrendPoint).reverse(),
    memberSince: formatRegistrationMonth(response.registeredAt),
  };
}

/** Reads another player's Public profile answer. */
export function toPublicProfile(response: PlayerPublicProfileResponse): PublicProfile {
  return {
    ...toProfileStatistics(response.stats),
    playerId: response.playerId,
    displayName: response.displayName,
  };
}
