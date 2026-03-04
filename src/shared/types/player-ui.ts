import type { GameThrowsResponse } from "./game-throws";

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
