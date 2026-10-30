// --- Player UI types (merged from player-ui.ts) ---

export interface UIRound {
  throw1?: number;
  throw2?: number;
  throw3?: number;
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

export interface UIPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number | null;
  placement: number | null;
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
