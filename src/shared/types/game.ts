export type {
  GameStatus,
  GameThrowsResponse,
  PlayerThrow,
  ScoreboardDelta,
  ThrowAckResponse,
} from "@/shared/api/game";

import type { GameThrowsResponse } from "@/shared/api/game";

/** The three rules a game is played with, as the game state carries them. */
export type GameSettings = GameThrowsResponse["settings"];

export type GameMode = "single-out" | "double-out" | "triple-out";

// --- Game UI props (merged from ui-props.ts) ---

export interface Round {
  throw1?: number | string;
  throw2?: number | string;
  throw3?: number | string;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  isRoundBust?: boolean;
  throw1IsDouble?: boolean;
  throw2IsDouble?: boolean;
  throw3IsDouble?: boolean;
  throw1IsTriple?: boolean;
  throw2IsTriple?: boolean;
  throw3IsTriple?: boolean;
}

export interface WinnerPlayerProps {
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
}

export interface FinishedGameProps {
  id: number;
  winnerRounds: number;
  winnerName: string | null;
  playersCount: number;
  date: string | null;
}

export interface GameDataProps {
  items: FinishedGameProps[];
  total: number;
}
