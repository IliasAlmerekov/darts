/**
 * Entity: Player
 * Functions to map player data between backend and UI formats
 */

import type { BackendPlayer, BackendRoundHistory, UIPlayer, UIRound } from "./types";

/**
 * Maps round history from backend format to UI format
 */
export function mapRoundHistory(roundHistory: BackendRoundHistory[]): UIRound[] {
  if (!Array.isArray(roundHistory)) {
    return [];
  }

  return roundHistory.map((roundData) => {
    const throws = roundData.throws || [];
    return {
      throw1: throws[0]?.value,
      throw2: throws[1]?.value,
      throw3: throws[2]?.value,
      isRoundBust: throws.some((t) => t.isBust),
    };
  });
}

/**
 * Maps current round throws to UI format
 */
export function mapCurrentRound(currentRoundThrows: BackendPlayer["currentRoundThrows"]): UIRound {
  if (!Array.isArray(currentRoundThrows)) {
    return {};
  }

  return {
    throw1: currentRoundThrows[0]?.value,
    throw2: currentRoundThrows[1]?.value,
    throw3: currentRoundThrows[2]?.value,
    isRoundBust: currentRoundThrows.some((t) => t.isBust),
  };
}

/**
 * Maps a player from backend format to UI format
 * @param player - player from backend
 * @param index - index of the player in the list
 * @returns player in UI format
 */
export function mapPlayerToUI(player: BackendPlayer, index: number): UIPlayer {
  // Maps round history
  const previousRounds = mapRoundHistory(player.roundHistory as unknown as BackendRoundHistory[]);

  // Maps current round
  const currentRoundData = mapCurrentRound(player.currentRoundThrows);

  // Combine: all previous rounds + current round
  const rounds = [...previousRounds, currentRoundData];

  return {
    id: player.id,
    name: player.name,
    score: player.score,
    isActive: player.isActive,
    isBust: player.isBust,
    position: player.position,
    index,
    rounds,
    isPlaying: player.position === 0, // 0 = still playing, > 0 = finished
    throwCount: player.throwsInCurrentRound,
  };
}

/**
 * Maps an array of players from backend format to UI format
 */
export function mapPlayersToUI(players: BackendPlayer[]): UIPlayer[] {
  return players.map((player, index) => mapPlayerToUI(player, index));
}

/**
 * Gets the active player from the list
 */
export function getActivePlayer(players: UIPlayer[]): UIPlayer | null {
  return players.find((player) => player.isActive) ?? null;
}

/**
 * Gets finished players, sorted by position
 */
export function getFinishedPlayers(players: UIPlayer[]): UIPlayer[] {
  return players.filter((p) => p.position > 0).sort((a, b) => a.position - b.position);
}
