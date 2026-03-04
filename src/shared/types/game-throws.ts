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
