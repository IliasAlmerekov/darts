import type { FinishedPlayerResponse } from "@/shared/api/game";
import type { WinnerPlayerProps } from "@/types";

const PODIUM_SIZE = 3;
const TWO_PLAYER_GAME = 2;
const MIN_RENDERED_ROUNDS = 1;

export interface FinishedGameStandings {
  standings: WinnerPlayerProps[];
  podiumData: WinnerPlayerProps[];
  leaderBoardList: WinnerPlayerProps[];
}

function createEmptyRound(): WinnerPlayerProps["rounds"][number] {
  return {};
}

function createEmptyRounds(count: number): WinnerPlayerProps["rounds"] {
  return Array.from({ length: Math.max(count, MIN_RENDERED_ROUNDS) }, () => createEmptyRound());
}

function mapFinishedPlayer(player: FinishedPlayerResponse): WinnerPlayerProps {
  return {
    id: player.playerId,
    name: player.username,
    score: 0,
    isActive: false,
    index: (player.placement ?? 1) - 1,
    rounds: createEmptyRounds(player.roundsPlayed),
    scoreAverage: player.roundAverage,
    roundCount: player.roundsPlayed,
  };
}

function createPodiumPlaceholder(): WinnerPlayerProps {
  return {
    id: 0,
    name: "-",
    score: 0,
    isActive: false,
    index: 0,
    rounds: [createEmptyRound()],
  };
}

/**
 * Orders finished players by placement and splits them into the podium and the
 * leaderboard. A two-player game gets a placeholder in the third podium slot.
 */
export function buildFinishedGameStandings(
  players: readonly FinishedPlayerResponse[],
): FinishedGameStandings {
  const standings = [...players]
    .sort(
      (a, b) => (a.placement ?? Number.MAX_SAFE_INTEGER) - (b.placement ?? Number.MAX_SAFE_INTEGER),
    )
    .map(mapFinishedPlayer);
  const podium = standings.slice(0, PODIUM_SIZE);

  return {
    standings,
    podiumData: podium.length === TWO_PLAYER_GAME ? [...podium, createPodiumPlaceholder()] : podium,
    leaderBoardList: standings.slice(PODIUM_SIZE),
  };
}
