import type { ParsedThrow } from "@/lib/parseThrowValue";
import type { GameThrowsResponse, PlayerThrow, ScoreboardDelta } from "@/types";

function getThrowPoints(throwData: ParsedThrow): number {
  const multiplier = throwData.isTriple ? 3 : throwData.isDouble ? 2 : 1;
  return throwData.value * multiplier;
}

function canCheckout(
  nextScore: number,
  throwData: ParsedThrow,
  settings: GameThrowsResponse["settings"],
): boolean {
  if (nextScore !== 0) {
    return true;
  }

  if (settings.doubleOut && !throwData.isDouble) {
    return false;
  }

  if (settings.tripleOut && !throwData.isTriple) {
    return false;
  }

  return true;
}

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

function getNextActivePlayer(
  players: GameThrowsResponse["players"],
  currentIndex: number,
): { nextIndex: number | null; wrapped: boolean } {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % players.length;
    const candidate = players[candidateIndex];
    if (candidate && candidate.score > 0) {
      return {
        nextIndex: candidateIndex,
        wrapped: currentIndex + offset >= players.length,
      };
    }
  }

  return {
    nextIndex: null,
    wrapped: false,
  };
}

function setActivePlayer(players: GameThrowsResponse["players"], activeIndex: number): void {
  players.forEach((player, index) => {
    player.isActive = index === activeIndex;
  });
}

function getNextFinishingPosition(players: GameThrowsResponse["players"]): number {
  const occupied = new Set(
    players
      .map((player) => player.position)
      .filter((position): position is number => position !== null && position > 0),
  );

  let next = 1;
  while (occupied.has(next)) {
    next += 1;
  }

  return next;
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

export function applyOptimisticThrow(
  currentGameData: GameThrowsResponse,
  throwData: ParsedThrow,
  expectedActivePlayerId?: number,
): GameThrowsResponse | null {
  const players = clonePlayers(currentGameData.players);
  if (
    typeof expectedActivePlayerId === "number" &&
    currentGameData.activePlayerId !== expectedActivePlayerId
  ) {
    return null;
  }

  const activePlayerIndex = players.findIndex(
    (player) => player.id === currentGameData.activePlayerId,
  );
  if (activePlayerIndex < 0) {
    return null;
  }

  const activePlayer = players[activePlayerIndex];
  if (!activePlayer) {
    return null;
  }

  const points = getThrowPoints(throwData);
  const projectedScore = activePlayer.score - points;
  const isBust =
    projectedScore < 0 || !canCheckout(projectedScore, throwData, currentGameData.settings);

  const updatedState: GameThrowsResponse = {
    ...currentGameData,
    players,
  };

  const throwRecord = {
    value: throwData.value,
    isDouble: throwData.isDouble,
    isTriple: throwData.isTriple,
    isBust,
  };

  const currentRoundThrows =
    activePlayer.throwsInCurrentRound > 0 ? [...(activePlayer.currentRoundThrows ?? [])] : [];
  const updatedRoundThrows = [...currentRoundThrows, throwRecord];
  const finalizedRound = { round: currentGameData.currentRound, throws: updatedRoundThrows };

  activePlayer.currentRoundThrows = updatedRoundThrows;
  activePlayer.throwsInCurrentRound = updatedRoundThrows.length;

  if (isBust) {
    const spentPoints = getSpentPointsInCurrentRound(currentRoundThrows);
    activePlayer.score += spentPoints;
    activePlayer.isBust = true;
    activePlayer.roundHistory = [...(activePlayer.roundHistory ?? []), finalizedRound];
    activePlayer.currentRoundThrows = [];
    activePlayer.throwsInCurrentRound = 0;

    const { nextIndex, wrapped } = getNextActivePlayer(players, activePlayerIndex);
    if (nextIndex === null) {
      setActivePlayer(players, activePlayerIndex);
      updatedState.activePlayerId = activePlayer.id;
      updatedState.currentThrowCount = 0;
      return updatedState;
    }

    const nextPlayer = players[nextIndex];
    if (!nextPlayer) {
      return updatedState;
    }

    nextPlayer.currentRoundThrows = [];
    nextPlayer.throwsInCurrentRound = 0;
    setActivePlayer(players, nextIndex);
    updatedState.activePlayerId = nextPlayer.id;
    updatedState.currentThrowCount = 0;
    if (wrapped) {
      updatedState.currentRound = currentGameData.currentRound + 1;
    }

    return updatedState;
  }

  activePlayer.score = projectedScore;
  activePlayer.isBust = false;

  const didFinishPlayer = projectedScore === 0;
  const didEndTurn = didFinishPlayer || updatedRoundThrows.length >= 3;

  if (didFinishPlayer) {
    activePlayer.position = activePlayer.position ?? getNextFinishingPosition(players);
  }

  if (!didEndTurn) {
    setActivePlayer(players, activePlayerIndex);
    updatedState.activePlayerId = activePlayer.id;
    updatedState.currentThrowCount = updatedRoundThrows.length;
    return updatedState;
  }

  activePlayer.roundHistory = [...(activePlayer.roundHistory ?? []), finalizedRound];
  activePlayer.currentRoundThrows = [];
  activePlayer.throwsInCurrentRound = 0;

  const { nextIndex, wrapped } = getNextActivePlayer(players, activePlayerIndex);
  if (nextIndex === null) {
    setActivePlayer(players, activePlayerIndex);
    updatedState.activePlayerId = activePlayer.id;
    updatedState.currentThrowCount = 0;
    updatedState.status = "finished";
    updatedState.winnerId = activePlayer.id;
    return updatedState;
  }

  const nextPlayer = players[nextIndex];
  if (!nextPlayer) {
    return updatedState;
  }

  nextPlayer.currentRoundThrows = [];
  nextPlayer.throwsInCurrentRound = 0;
  setActivePlayer(players, nextIndex);
  updatedState.activePlayerId = nextPlayer.id;
  updatedState.currentThrowCount = 0;
  if (wrapped) {
    updatedState.currentRound = currentGameData.currentRound + 1;
  }

  return updatedState;
}

export function applyScoreboardDeltaToGameState(
  currentGameData: GameThrowsResponse,
  scoreboardDelta: ScoreboardDelta,
): GameThrowsResponse {
  const players = clonePlayers(currentGameData.players);
  const changedPlayerById = new Map(
    scoreboardDelta.changedPlayers.map((playerDelta) => [playerDelta.playerId, playerDelta]),
  );

  const previousActivePlayerId = currentGameData.activePlayerId;
  let activePlayerId = previousActivePlayerId;

  const finalizePlayerTurn = (playerId: number): void => {
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return;
    }

    if (player.currentRoundThrows.length > 0) {
      player.roundHistory = [
        ...(player.roundHistory ?? []),
        { round: currentGameData.currentRound, throws: [...player.currentRoundThrows] },
      ];
    }
    player.currentRoundThrows = [];
    player.throwsInCurrentRound = 0;
  };

  players.forEach((player) => {
    const playerDelta = changedPlayerById.get(player.id);
    if (!playerDelta) {
      return;
    }

    player.score = playerDelta.score;
    player.position = playerDelta.position;
    player.isActive = playerDelta.isActive;
    if (typeof playerDelta.isBust === "boolean") {
      player.isBust = playerDelta.isBust;
    }

    if (playerDelta.isActive) {
      activePlayerId = player.id;
    }
  });

  if (activePlayerId !== previousActivePlayerId) {
    if (previousActivePlayerId !== null) {
      finalizePlayerTurn(previousActivePlayerId);
    }
    const nextActivePlayer = players.find((player) => player.id === activePlayerId);
    if (nextActivePlayer) {
      nextActivePlayer.currentRoundThrows = [];
      nextActivePlayer.throwsInCurrentRound = 0;
    }
  }

  const activePlayer = players.find((player) => player.id === activePlayerId);
  const currentThrowCount = activePlayer
    ? Math.max(activePlayer.currentRoundThrows.length, activePlayer.throwsInCurrentRound)
    : currentGameData.currentThrowCount;

  return {
    ...currentGameData,
    players,
    activePlayerId,
    currentThrowCount,
    currentRound: scoreboardDelta.currentRound,
    status: scoreboardDelta.status,
    winnerId: scoreboardDelta.winnerId,
  };
}
