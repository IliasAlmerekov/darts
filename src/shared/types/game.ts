export type GameStatus = "lobby" | "started" | "finished";

export type GameMode = "single-out" | "double-out" | "triple-out";

// --- Game throws (merged from game-throws.ts) ---

export interface PlayerThrow {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
}

export interface RoundHistory {
  round?: number;
  throws: PlayerThrow[];
}

export interface GameThrowsResponse {
  id: number;
  status: GameStatus;
  currentRound: number;
  activePlayerId: number | null;
  currentThrowCount: number;
  players: {
    id: number;
    name: string;
    score: number;
    isActive: boolean;
    isBust: boolean;
    position: number | null;
    throwsInCurrentRound: number;
    currentRoundThrows: PlayerThrow[];
    roundHistory: RoundHistory[];
  }[];
  winnerId: number | null;
  settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  };
}

export interface ThrowDelta {
  id: number;
  playerId: number;
  playerName: string;
  value: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
  score: number;
  roundNumber: number;
  timestamp: string;
}

export interface ScoreboardPlayerDelta {
  playerId: number;
  name: string;
  score: number;
  position: number | null;
  isActive: boolean;
  isGuest: boolean;
  isBust: boolean | null;
}

export interface ScoreboardDelta {
  changedPlayers: ScoreboardPlayerDelta[];
  winnerId: number | null;
  status: GameStatus;
  currentRound: number;
}

export interface ThrowAckResponse {
  success: boolean;
  gameId: number;
  stateVersion: string;
  throw: ThrowDelta | null;
  scoreboardDelta: ScoreboardDelta;
  serverTs: string;
}

// --- Game UI props (merged from ui-props.ts) ---

export interface Round {
  throw1?: number | string;
  throw2?: number | string;
  throw3?: number | string;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  isRoundBust?: boolean;
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
