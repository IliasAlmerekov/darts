export enum GameStatus {
  Lobby = "lobby",
  Started = "started",
  Finished = "finished",
}

export enum GameMode {
  Standard = "standard",
  DoubleOut = "double-out",
  TripleOut = "triple-out",
}

export interface GamePlayer {
  id: number;
  username: string;
  score: number;
  position: number | null;
  isWinner: boolean;
  playOrder: number;
  throws: number[];
}

export interface ThrowRecord {
  playerId: number;
  round: number;
  throwNumber: number;
  value: number;
  score: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
  timestamp: string;
}

export interface GameState {
  gameId: number;
  status: GameStatus;
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
  currentRound: number;
  currentPlayerId: number;
  winner: GamePlayer | null;
  players: GamePlayer[];
  throws: ThrowRecord[];
}

// --- Game throws (merged from game-throws.ts) ---

export type PlayerThrow = {
  value: number;
  isDouble?: boolean;
  isTriple?: boolean;
  isBust?: boolean;
};

export type RoundHistory = {
  round?: number;
  throws: PlayerThrow[];
};

export type GameThrowsResponse = {
  id: number;
  status: string;
  currentRound: number;
  activePlayerId: number;
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
};

export type ThrowDelta = {
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
};

export type ScoreboardPlayerDelta = {
  playerId: number;
  name: string;
  score: number;
  position: number | null;
  isActive: boolean;
  isGuest: boolean;
  isBust: boolean | null;
};

export type ScoreboardDelta = {
  changedPlayers: ScoreboardPlayerDelta[];
  winnerId: number | null;
  status: string;
  currentRound: number;
};

export type ThrowAckResponse = {
  success: boolean;
  gameId: number;
  stateVersion: string;
  throw: ThrowDelta | null;
  scoreboardDelta: ScoreboardDelta;
  serverTs: string;
};

// --- Game UI props (merged from ui-props.ts) ---

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
