export type GameStatus = "lobby" | "started" | "finished";

export type GameMode = "single-out" | "double-out" | "triple-out";

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
  status: GameStatus;
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
  throw1?: number | string | undefined;
  throw2?: number | string | undefined;
  throw3?: number | string | undefined;
  throw1IsBust?: boolean | undefined;
  throw2IsBust?: boolean | undefined;
  throw3IsBust?: boolean | undefined;
  isRoundBust?: boolean | undefined;
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
  items: FinishedGameProps[];
  total: number;
};
