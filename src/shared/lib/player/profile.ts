import type { PlayerProfileGame, PlayerProfileResponse } from "@/shared/api/player";

const MISSING_VALUE = "–";
const UNKNOWN_NAME = "Unknown";

interface ProfileParticipant {
  key: string;
  label: string;
}

export interface ProfileHistoryRow {
  gameId: number;
  summary: string;
  participants: ProfileParticipant[];
}

export interface ScoringTrendPoint {
  gameId: number;
  roundAverage: number;
  label: string;
}

/** The Player profile as the page shows it. */
export interface PlayerProfile {
  stats: { gamesPlayed: string; scoreAverage: string };
  history: ProfileHistoryRow[];
  scoringTrend: ScoringTrendPoint[];
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
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

function formatOrdinal(placement: number): string {
  return `${placement}${ORDINAL_SUFFIXES[ordinalRules.select(placement)] ?? "th"}`;
}

function formatRoundAverage(roundAverage: number): string {
  return `Avg ${roundAverage.toFixed(1)}`;
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
      formatRoundAverage(game.roundAverage),
    ]),
    participants: game.participants.map((participant, index) => {
      const position =
        participant.placement === null || participant.placement === undefined
          ? MISSING_VALUE
          : `${participant.placement}.`;
      const name = participant.displayName ?? UNKNOWN_NAME;
      return {
        // A Guest has no player id; its position in the finished game never changes.
        key:
          participant.playerId === null || participant.playerId === undefined
            ? `guest-${index}`
            : `player-${participant.playerId}`,
        label: `${position} ${name}${participant.isSelf ? " (you)" : ""}`,
      };
    }),
  };
}

function toScoringTrendPoint(game: PlayerProfileGame): ScoringTrendPoint {
  return {
    gameId: game.gameId,
    roundAverage: game.roundAverage,
    label: joinParts([formatFinishedAt(game.finishedAt), formatRoundAverage(game.roundAverage)]),
  };
}

/**
 * Reads the profile answer. Recent games arrive newest first: history keeps that order,
 * and the scoring trend runs oldest first, left to right.
 */
export function toPlayerProfile(response: PlayerProfileResponse): PlayerProfile {
  const { scoreAverage } = response.stats;

  return {
    stats: {
      gamesPlayed: String(response.stats.gamesPlayed),
      scoreAverage:
        scoreAverage === null || scoreAverage === undefined
          ? MISSING_VALUE
          : scoreAverage.toFixed(2),
    },
    history: response.recentGames.map(toHistoryRow),
    scoringTrend: response.recentGames.map(toScoringTrendPoint).reverse(),
  };
}
