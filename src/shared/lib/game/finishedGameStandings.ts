import type { FinishedPlayerResponse, WinnerPlayerProps } from "@/types";

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
    index: player.position - 1,
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
 * Splits finished players, in the order the backend returns them, into the podium and the
 * leaderboard. A two-player game gets a placeholder in the third podium slot.
 */
export function buildFinishedGameStandings(
  players: readonly FinishedPlayerResponse[],
): FinishedGameStandings {
  const standings = players.map(mapFinishedPlayer);
  const podium = standings.slice(0, PODIUM_SIZE);

  return {
    standings,
    podiumData: podium.length === TWO_PLAYER_GAME ? [...podium, createPodiumPlaceholder()] : podium,
    leaderBoardList: standings.slice(PODIUM_SIZE),
  };
}
