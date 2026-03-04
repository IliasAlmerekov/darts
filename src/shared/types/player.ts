export interface PlayerProfile {
  id: number;
  username: string;
  gamesPlayed?: number;
  scoreAverage?: number;
}

export interface PlayerStats {
  playerId: number;
  username: string;
  position: number;
  roundsPlayed: number;
  roundAverage: number;
}

export interface PlayerOverviewItem {
  id: number;
  winnerRounds: number;
  winnerName: string;
  playersCount: number;
  date: string;
}
