import type { GameThrowsResponse, PlayerThrow } from "@/types";

function getSpentPointsInCurrentRound(currentRoundThrows: readonly PlayerThrow[]): number {
  return currentRoundThrows.reduce((sum, currentThrow) => {
    const multiplier = currentThrow.isTriple ? 3 : currentThrow.isDouble ? 2 : 1;
    return sum + currentThrow.value * multiplier;
  }, 0);
}

function clonePlayers(players: GameThrowsResponse["players"]): GameThrowsResponse["players"] {
  return players.map((player) => ({
    ...player,
    currentRoundThrows: (player.currentRoundThrows ?? []).map((currentThrow) => ({
      ...currentThrow,
    })),
    roundHistory: (player.roundHistory ?? []).map((round) => ({
      ...round,
      throws: (round.throws ?? []).map((currentThrow) => ({ ...currentThrow })),
    })),
  }));
}

function setActivePlayer(players: GameThrowsResponse["players"], activeIndex: number): void {
  players.forEach((player, index) => {
    player.isActive = index === activeIndex;
  });
}

function getUndoTargetFromCompletedRound(
  currentGameData: GameThrowsResponse,
  players: GameThrowsResponse["players"],
): {
  player: GameThrowsResponse["players"][number];
  playerIndex: number;
  roundIndex: number;
  roundNumber: number;
} | null {
  const activePlayerIndex =
    typeof currentGameData.activePlayerId === "number"
      ? players.findIndex((player) => player.id === currentGameData.activePlayerId)
      : -1;
  const activePlayer = activePlayerIndex >= 0 ? players[activePlayerIndex] : undefined;
  const activePlayerLastRoundIndex = activePlayer ? activePlayer.roundHistory.length - 1 : -1;
  const activePlayerLastRound =
    activePlayerLastRoundIndex >= 0
      ? activePlayer?.roundHistory[activePlayerLastRoundIndex]
      : undefined;

  if (
    activePlayer &&
    (currentGameData.status === "finished" || activePlayer.score === 0) &&
    activePlayerLastRound &&
    activePlayerLastRound.throws.length > 0
  ) {
    return {
      player: activePlayer,
      playerIndex: activePlayerIndex,
      roundIndex: activePlayerLastRoundIndex,
      roundNumber:
        typeof activePlayerLastRound.round === "number" && activePlayerLastRound.round > 0
          ? activePlayerLastRound.round
          : currentGameData.currentRound,
    };
  }

  if (activePlayerIndex >= 0) {
    for (let offset = 1; offset <= players.length; offset += 1) {
      const candidateIndex = (activePlayerIndex - offset + players.length) % players.length;
      const candidate = players[candidateIndex];
      const roundIndex = candidate ? candidate.roundHistory.length - 1 : -1;
      const lastRound = roundIndex >= 0 ? candidate?.roundHistory[roundIndex] : undefined;

      if (!candidate || !lastRound || lastRound.throws.length === 0) {
        continue;
      }

      return {
        player: candidate,
        playerIndex: candidateIndex,
        roundIndex,
        roundNumber:
          typeof lastRound.round === "number" && lastRound.round > 0
            ? lastRound.round
            : currentGameData.currentRound,
      };
    }
  }

  let fallbackCandidate: {
    player: GameThrowsResponse["players"][number];
    playerIndex: number;
    roundIndex: number;
    roundNumber: number;
  } | null = null;

  players.forEach((player, playerIndex) => {
    const roundIndex = player.roundHistory.length - 1;
    const lastRound = roundIndex >= 0 ? player.roundHistory[roundIndex] : undefined;
    if (!lastRound || lastRound.throws.length === 0) {
      return;
    }

    const roundNumber =
      typeof lastRound.round === "number" && lastRound.round > 0
        ? lastRound.round
        : currentGameData.currentRound;

    if (
      fallbackCandidate === null ||
      roundNumber > fallbackCandidate.roundNumber ||
      (roundNumber === fallbackCandidate.roundNumber && playerIndex > fallbackCandidate.playerIndex)
    ) {
      fallbackCandidate = {
        player,
        playerIndex,
        roundIndex,
        roundNumber,
      };
    }
  });

  return fallbackCandidate;
}

export function applyOptimisticUndo(
  currentGameData: GameThrowsResponse,
): GameThrowsResponse | null {
  const players = clonePlayers(currentGameData.players);
  const activePlayer = players.find((player) => player.id === currentGameData.activePlayerId);
  const activePlayerIndex = activePlayer
    ? players.findIndex((player) => player.id === activePlayer.id)
    : -1;

  if (activePlayer && activePlayer.currentRoundThrows.length > 0) {
    const previousThrows = [...activePlayer.currentRoundThrows];
    const removedThrow = previousThrows.pop();
    if (!removedThrow) {
      return null;
    }

    const multiplier = removedThrow.isTriple ? 3 : removedThrow.isDouble ? 2 : 1;
    const points = removedThrow.value * multiplier;

    activePlayer.currentRoundThrows = previousThrows;
    activePlayer.throwsInCurrentRound = previousThrows.length;
    activePlayer.score += points;
    activePlayer.isBust = false;

    if (activePlayer.score > 0 && activePlayer.position !== null) {
      activePlayer.position = null;
    }

    if (activePlayerIndex >= 0) {
      setActivePlayer(players, activePlayerIndex);
    }

    return {
      ...currentGameData,
      players,
      currentThrowCount: previousThrows.length,
      status: "started",
      winnerId: null,
    };
  }

  const completedRoundTarget = getUndoTargetFromCompletedRound(currentGameData, players);
  if (!completedRoundTarget) {
    return null;
  }

  const { player, playerIndex, roundIndex, roundNumber } = completedRoundTarget;
  const roundToRestore = player.roundHistory[roundIndex];
  if (!roundToRestore) {
    return null;
  }

  const remainingRoundHistory = player.roundHistory.slice(0, roundIndex);
  const restoredThrows = [...roundToRestore.throws];
  const removedThrow = restoredThrows.pop();
  if (!removedThrow) {
    return null;
  }

  player.roundHistory = remainingRoundHistory;
  player.currentRoundThrows = restoredThrows;
  player.throwsInCurrentRound = restoredThrows.length;
  player.isBust = false;
  player.position = null;

  if (removedThrow.isBust) {
    player.score -= getSpentPointsInCurrentRound(restoredThrows);
  } else {
    const multiplier = removedThrow.isTriple ? 3 : removedThrow.isDouble ? 2 : 1;
    player.score += removedThrow.value * multiplier;
  }

  setActivePlayer(players, playerIndex);

  return {
    ...currentGameData,
    players,
    activePlayerId: player.id,
    currentThrowCount: restoredThrows.length,
    currentRound: roundNumber,
    status: "started",
    winnerId: null,
  };
}
