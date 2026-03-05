import type { GameThrowsResponse } from "./game";

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

// --- Player UI types (merged from player-ui.ts) ---

export type BackendPlayer = GameThrowsResponse["players"][number];
export type BackendRoundHistory = BackendPlayer["roundHistory"][number];

export interface UIRound {
  throw1?: number;
  throw2?: number;
  throw3?: number;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  isRoundBust?: boolean;
}

export interface UIPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number | null;
  index: number;
  rounds: UIRound[];
  isPlaying: boolean;
  throwCount: number;
}

// --- Player props (merged from ui-props.ts) ---

export type PlayerProps = {
  gamesPlayed?: number;
  scoreAverage?: number;
  id: number;
  name: string;
  playerId?: number;
};

export type PlayerDataProps = {
  items?: PlayerProps[];
  total?: number;
};

export type UserProps = {
  id: number;
  name: string;
};
