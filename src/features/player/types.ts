import type { PlayerOverviewItem, PlayerProfile, PlayerStats } from "@/types/player";

export interface BackendThrow {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
}

export interface BackendRoundHistory {
  throws: BackendThrow[];
}

export interface BackendPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number | null;
  throwsInCurrentRound: number;
  currentRoundThrows: BackendThrow[];
  roundHistory: BackendRoundHistory[];
}

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

export type { PlayerProfile, PlayerStats, PlayerOverviewItem };
