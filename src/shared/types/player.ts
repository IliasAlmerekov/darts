import type { GameThrowsResponse } from "./game";

// --- Player UI types (merged from player-ui.ts) ---

export type BackendPlayer = GameThrowsResponse["players"][number];
export type BackendRoundHistory = BackendPlayer["roundHistory"][number];

export interface UIRound {
  throw1?: number | undefined;
  throw2?: number | undefined;
  throw3?: number | undefined;
  throw1IsBust?: boolean | undefined;
  throw2IsBust?: boolean | undefined;
  throw3IsBust?: boolean | undefined;
  isRoundBust?: boolean | undefined;
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

export interface PlayerProps {
  gamesPlayed?: number;
  scoreAverage?: number;
  id: number;
  name: string;
  playerId?: number;
}

export interface PlayerDataProps {
  items: PlayerProps[];
  total: number;
}

export interface UserProps {
  id: number;
  name: string;
}
