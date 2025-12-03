/**
 * Entity: Player
 * Index file exporting types and mappers
 */

// Types
export type {
  PlayerThrow,
  BackendRoundHistory,
  UIRound,
  BackendPlayer,
  UIPlayer,
  FinishedPlayer,
} from "./model/types";

// Mappers
export {
  mapPlayerToUI,
  mapPlayersToUI,
  mapRoundHistory,
  mapCurrentRound,
  getActivePlayer,
  getFinishedPlayers,
} from "./model/mappers";
