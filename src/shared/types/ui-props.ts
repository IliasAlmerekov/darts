/**
 * Explicit type definitions replacing the former BASIC.d.ts ambient namespace.
 * Only types actually used in the codebase are preserved.
 */

export type Round = {
  throw1?: number | string;
  throw2?: number | string;
  throw3?: number | string;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  isRoundBust?: boolean;
};

export type WinnerPlayerProps = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  index: number;
  rounds: Round[];
  isPlaying?: boolean;
  isBust?: boolean;
  throwCount?: number;
  scoreAverage?: number;
  roundCount?: number;
};

export type PlayerProps = {
  gamesPlayed?: number;
  scoreAverage?: number;
  id: number;
  name: string;
  playerId?: number;
};

export type FinishedGameProps = {
  id: number;
  winnerRounds: number;
  winnerName: string;
  playersCount: number;
  date: string;
};

export type GameDataProps = {
  items?: FinishedGameProps[];
  total?: number;
};

export type PlayerDataProps = {
  items?: PlayerProps[];
  total?: number;
};

export type UserProps = {
  id: number;
  name: string;
};
