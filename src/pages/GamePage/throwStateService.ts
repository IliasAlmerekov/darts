import type { ParsedThrow } from "@/lib/parseThrowValue";
import type { GameThrowsResponse, ScoreboardDelta } from "@/types";

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

function getSpentPointsInCurrentRound(
  currentRoundThrows: GameThrowsResponse["players"][number]["currentRoundThrows"],
): number {
  return currentRoundThrows.reduce((sum, currentThrow) => {
    const multiplier = currentThrow.isTriple ? 3 : currentThrow.isDouble ? 2 : 1;
    return sum + currentThrow.value * multiplier;
  }, 0);
}

function clonePlayers(players: GameThrowsResponse["players"]): GameThrowsResponse["players"] {
  return players.map((player) => ({
    ...player,
    currentRoundThrows: [...(player.currentRoundThrows ?? [])],
    roundHistory: [...(player.roundHistory ?? [])],
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

export function applyOptimisticUndo(
  currentGameData: GameThrowsResponse,
): GameThrowsResponse | null {
  const players = clonePlayers(currentGameData.players);
  const activePlayer = players.find((player) => player.id === currentGameData.activePlayerId);
  if (!activePlayer || activePlayer.currentRoundThrows.length <= 0) {
    return null;
  }

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

  return {
    ...currentGameData,
    players,
    currentThrowCount: previousThrows.length,
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
