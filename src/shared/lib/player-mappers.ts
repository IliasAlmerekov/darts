import type { BackendPlayer, BackendRoundHistory, UIPlayer, UIRound } from "@/types/player-ui";

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
      throw1IsBust: throws[0]?.isBust,
      throw2IsBust: throws[1]?.isBust,
      throw3IsBust: throws[2]?.isBust,
      isRoundBust: throws.some((t) => t.isBust),
    };
  });
}

export function mapCurrentRound(currentRoundThrows: BackendPlayer["currentRoundThrows"]): UIRound {
  if (!Array.isArray(currentRoundThrows)) {
    return {};
  }

  return {
    throw1: currentRoundThrows[0]?.value,
    throw2: currentRoundThrows[1]?.value,
    throw3: currentRoundThrows[2]?.value,
    throw1IsBust: currentRoundThrows[0]?.isBust,
    throw2IsBust: currentRoundThrows[1]?.isBust,
    throw3IsBust: currentRoundThrows[2]?.isBust,
    isRoundBust: currentRoundThrows.some((t) => t.isBust),
  };
}

export function mapPlayerToUI(player: BackendPlayer, index: number): UIPlayer {
  const previousRounds = mapRoundHistory(player.roundHistory as unknown as BackendRoundHistory[]);
  const currentRoundData = mapCurrentRound(player.currentRoundThrows);

  return {
    id: player.id,
    name: player.name,
    score: player.score,
    isActive: player.isActive,
    isBust: player.isBust,
    position: player.position,
    index,
    rounds: [...previousRounds, currentRoundData],
    isPlaying: player.score > 0,
    throwCount: player.throwsInCurrentRound,
  };
}

export function mapPlayersToUI(players: BackendPlayer[]): UIPlayer[] {
  return players.map((player, index) => mapPlayerToUI(player, index));
}

export function getActivePlayer(players: UIPlayer[]): UIPlayer | null {
  return players.find((player) => player.isActive) ?? null;
}

export function getFinishedPlayers(players: UIPlayer[]): UIPlayer[] {
  return players
    .filter((p) => p.score === 0)
    .sort((a, b) => {
      if (a.position == null && b.position == null) return 0;
      if (a.position == null) return 1;
      if (b.position == null) return -1;
      return a.position - b.position;
    });
}
