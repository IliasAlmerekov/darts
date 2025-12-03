/**
 * Entity: Player
 * Types to work with player data
 */

/**
 * Player throw (backend data)
 */
export interface PlayerThrow {
  value: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
}

/**
 * Round history entry from backend
 */
export interface BackendRoundHistory {
  round: number;
  throws: PlayerThrow[];
}

/**
 * Round for UI (simplified format)
 */
export interface UIRound {
  throw1?: number | string;
  throw2?: number | string;
  throw3?: number | string;
  isRoundBust?: boolean;
}

/**
 * Player from API response (backend format)
 */
export interface BackendPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number;
  throwsInCurrentRound: number;
  currentRoundThrows: PlayerThrow[];
  roundHistory: BackendRoundHistory[];
}

/**
 * Player for UI components
 */
export interface UIPlayer {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  isBust: boolean;
  position: number;
  index: number;
  rounds: UIRound[];
  isPlaying: boolean;
  throwCount: number;
  currentRound?: number;
}

/**
 * Finished player (for podium)
 */
export interface FinishedPlayer {
  id: number;
  name: string;
  score: number;
  position: number;
  roundsPlayed?: number;
  scoreAverage?: number;
}
