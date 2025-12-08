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
