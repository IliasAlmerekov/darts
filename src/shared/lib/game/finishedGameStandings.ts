import type { FinishedPlayerResponse } from "@/shared/api/game";

const PODIUM_SIZE = 3;
const TWO_PLAYER_GAME = 2;
const NO_AVERAGE = "-";

/** One player's line in the standings, as the Podium and the Leaderboard show it. */
export interface StandingsEntry {
  id: number;
  name: string;
  rounds: number;
  /** The backend three-dart average with two decimals, or `-` when the player played no round. */
  threeDartAverage: string;
  isPlaceholder?: true;
}

export interface FinishedGameStandings {
  podiumData: StandingsEntry[];
  leaderBoardList: StandingsEntry[];
}

const PODIUM_PLACEHOLDER: StandingsEntry = {
  id: 0,
  name: "-",
  rounds: 0,
  threeDartAverage: NO_AVERAGE,
  isPlaceholder: true,
};

function toStandingsEntry(player: FinishedPlayerResponse): StandingsEntry {
  const rounds = Math.max(player.roundsPlayed, 0);

  return {
    id: player.playerId,
    name: player.username,
    rounds,
    threeDartAverage: rounds === 0 ? NO_AVERAGE : player.roundAverage.toFixed(2),
  };
}

/**
 * Orders finished players by placement and splits them into the podium and the
 * leaderboard. A two-player game gets the podium placeholder in the third slot.
 * Missing players, as before the finished game query has data, give empty standings.
 */
export function buildFinishedGameStandings(
  players: readonly FinishedPlayerResponse[] | null | undefined,
): FinishedGameStandings {
  const standings = [...(players ?? [])]
    .sort(
      (a, b) => (a.placement ?? Number.MAX_SAFE_INTEGER) - (b.placement ?? Number.MAX_SAFE_INTEGER),
    )
    .map(toStandingsEntry);
  const podium = standings.slice(0, PODIUM_SIZE);

  return {
    podiumData: podium.length === TWO_PLAYER_GAME ? [...podium, { ...PODIUM_PLACEHOLDER }] : podium,
    leaderBoardList: standings.slice(PODIUM_SIZE),
  };
}
