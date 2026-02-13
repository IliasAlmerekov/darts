import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGameThrows,
  recordThrow,
  resetGameStateVersion,
  setGameStateVersion,
  undoLastThrow,
  type GameThrowsResponse,
  type ScoreboardDelta,
} from "../api";
import { parseThrowValue } from "@/lib/parseThrowValue";
import { playSound } from "@/lib/soundPlayer";
import { $gameData, setGameData } from "@/stores";
import { ApiError } from "@/lib/api/errors";

interface UseThrowHandlerOptions {
  gameId: number | null;
}

interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
  /**
   * Backward-compatible flag used by existing consumers.
   * In non-blocking throw mode it only reflects undo processing.
   */
  isActionInFlight: boolean;
  pendingThrowCount: number;
  isQueueFull: boolean;
  syncMessage: string | null;
  clearSyncMessage: () => void;
  isUndoInFlight: boolean;
}

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type ParsedThrow = ReturnType<typeof parseThrowValue>;

type ThrowQueueItem = {
  request: {
    playerId: number;
    value: number;
    isDouble: boolean;
    isTriple: boolean;
  };
};

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

function applyOptimisticUndo(currentGameData: GameThrowsResponse): GameThrowsResponse | null {
  const players = clonePlayers(currentGameData.players);
  const activePlayer = players.find((player) => player.id === currentGameData.activePlayerId);
  if (!activePlayer) {
    return null;
  }

  if (activePlayer.currentRoundThrows.length <= 0) {
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

function applyOptimisticThrow(
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

  const baseCurrentRoundThrows =
    activePlayer.throwsInCurrentRound > 0 ? [...(activePlayer.currentRoundThrows ?? [])] : [];
  const currentRoundThrows = baseCurrentRoundThrows;
  const updatedRoundThrows = [...currentRoundThrows, throwRecord];
  const finalizedRound = { round: currentGameData.currentRound, throws: updatedRoundThrows };

  activePlayer.currentRoundThrows = updatedRoundThrows;
  activePlayer.throwsInCurrentRound = updatedRoundThrows.length;

  if (isBust) {
    const spentPoints = getSpentPointsInCurrentRound(currentRoundThrows);
    activePlayer.score = activePlayer.score + spentPoints;
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

    players[nextIndex].currentRoundThrows = [];
    players[nextIndex].throwsInCurrentRound = 0;
    setActivePlayer(players, nextIndex);
    updatedState.activePlayerId = players[nextIndex].id;
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

  players[nextIndex].currentRoundThrows = [];
  players[nextIndex].throwsInCurrentRound = 0;
  setActivePlayer(players, nextIndex);
  updatedState.activePlayerId = players[nextIndex].id;
  updatedState.currentThrowCount = 0;
  if (wrapped) {
    updatedState.currentRound = currentGameData.currentRound + 1;
  }

  return updatedState;
}

function applyScoreboardDeltaToGameState(
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
    finalizePlayerTurn(previousActivePlayerId);
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

export function isThrowNotAllowedConflict(error: unknown): boolean {
  if (!(error instanceof ApiError) || 409 !== error.status) {
    return false;
  }

  const payload = error.data;
  if (null === payload || "object" !== typeof payload) {
    return false;
  }

  const typedPayload = payload as ApiErrorPayload;
  return "GAME_THROW_NOT_ALLOWED" === typedPayload.error;
}

/**
 * Provides throw and undo handlers for the active game.
 */
export function useThrowHandler({ gameId }: UseThrowHandlerOptions): UseThrowHandlerReturn {
  const pendingQueueRef = useRef<ThrowQueueItem[]>([]);
  const isDrainingRef = useRef(false);
  const isQueueSyncFailedRef = useRef(false);
  const pendingUndoRequestRef = useRef(false);
  const [pendingThrowCount, setPendingThrowCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const isUndoInFlightRef = useRef(false);

  const syncPendingCount = useCallback(() => {
    setPendingThrowCount(pendingQueueRef.current.length);
  }, []);

  const clearQueue = useCallback(() => {
    pendingQueueRef.current = [];
    pendingUndoRequestRef.current = false;
    syncPendingCount();
  }, [syncPendingCount]);

  const reconcileGameState = useCallback(
    async (message: string): Promise<void> => {
      if (!gameId) {
        setSyncMessage(message);
        return;
      }

      try {
        resetGameStateVersion(gameId);
        const refreshedGameState = await getGameThrows(gameId);
        setGameData(refreshedGameState);
      } catch (refreshError) {
        console.error("Failed to refresh game state during reconciliation:", refreshError);
      } finally {
        setSyncMessage(message);
      }
    },
    [gameId],
  );

  const executeUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      return;
    }

    isUndoInFlightRef.current = true;

    if (!gameId) {
      isUndoInFlightRef.current = false;
      return;
    }

    try {
      const currentGameData = $gameData.get();
      const optimisticUndoState = currentGameData ? applyOptimisticUndo(currentGameData) : null;
      if (optimisticUndoState) {
        setGameData(optimisticUndoState);
      }

      const updatedGameState: GameThrowsResponse = await undoLastThrow(gameId);
      setGameData(updatedGameState);
      playSound("undo");
    } catch (error) {
      console.error("Failed to undo throw:", error);
      playSound("error");
    } finally {
      isUndoInFlightRef.current = false;
    }
  }, [gameId]);

  const drainQueue = useCallback(async (): Promise<void> => {
    if (!gameId || isDrainingRef.current) {
      return;
    }

    isDrainingRef.current = true;
    isQueueSyncFailedRef.current = false;

    try {
      while (pendingQueueRef.current.length > 0) {
        const nextThrow = pendingQueueRef.current[0];
        if (!nextThrow) {
          break;
        }

        try {
          const throwAck = await recordThrow(gameId, nextThrow.request);
          if (!throwAck.success) {
            throw new Error("Throw request was not accepted by server");
          }

          setGameStateVersion(gameId, throwAck.stateVersion);
          pendingQueueRef.current.shift();
          syncPendingCount();

          if (0 === pendingQueueRef.current.length) {
            const latestGameState = $gameData.get();
            if (latestGameState) {
              setGameData(
                applyScoreboardDeltaToGameState(latestGameState, throwAck.scoreboardDelta),
              );
            }
          }
        } catch (error) {
          console.error("Failed to sync queued throw:", error);
          isQueueSyncFailedRef.current = true;
          clearQueue();

          if (isThrowNotAllowedConflict(error)) {
            await reconcileGameState(
              "Game state changed in another session. Synced latest game state.",
            );
          } else {
            await reconcileGameState("Could not sync throws. Refreshed game state from server.");
          }

          playSound("error");
          break;
        }
      }
    } finally {
      isDrainingRef.current = false;

      if (
        pendingUndoRequestRef.current &&
        !isQueueSyncFailedRef.current &&
        0 === pendingQueueRef.current.length
      ) {
        pendingUndoRequestRef.current = false;
        void executeUndo();
      }
    }
  }, [clearQueue, executeUndo, gameId, reconcileGameState, syncPendingCount]);

  useEffect(() => {
    clearQueue();
    isDrainingRef.current = false;
    isQueueSyncFailedRef.current = false;
    pendingUndoRequestRef.current = false;
    setSyncMessage(null);
    isUndoInFlightRef.current = false;
  }, [clearQueue, gameId]);

  const clearSyncMessage = useCallback(() => {
    setSyncMessage(null);
  }, []);

  const handleThrow = useCallback(
    async (value: string | number): Promise<void> => {
      if (isUndoInFlightRef.current) {
        console.warn("Cannot throw: undo is still processing");
        return;
      }

      try {
        setSyncMessage(null);
        const currentGameData = $gameData.get();

        if (!gameId || !currentGameData) {
          console.warn("Cannot throw: missing gameId or gameData");
          return;
        }

        const activePlayer = currentGameData.players.find(
          (p) => p.id === currentGameData.activePlayerId,
        );

        if (!activePlayer) {
          console.error("Cannot throw: no active player found", {
            activePlayerId: currentGameData.activePlayerId,
            players: currentGameData.players.map((p) => ({
              id: p.id,
              name: p.name,
              score: p.score,
              isActive: p.isActive,
              isBust: p.isBust,
            })),
          });
          return;
        }

        if (pendingQueueRef.current.length >= 3) {
          setSyncMessage("Throw queue is full. Wait until current throws are synchronized.");
          return;
        }

        const parsedThrow = parseThrowValue(value);
        const optimisticState = applyOptimisticThrow(currentGameData, parsedThrow, activePlayer.id);
        if (!optimisticState) {
          console.error("Cannot throw: failed to build optimistic game state");
          return;
        }

        setGameData(optimisticState);

        pendingQueueRef.current.push({
          request: {
            playerId: activePlayer.id,
            value: parsedThrow.value,
            isDouble: parsedThrow.isDouble,
            isTriple: parsedThrow.isTriple,
          },
        });
        syncPendingCount();
        void drainQueue();
      } catch (error) {
        console.error("Failed to record throw:", error);
        await reconcileGameState("Throw failed. Refreshed game state from server.");
        playSound("error");
      }
    },
    [drainQueue, gameId, reconcileGameState, syncPendingCount],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (isUndoInFlightRef.current) {
      console.warn("Cannot undo: previous undo action is still processing");
      return;
    }

    if (pendingQueueRef.current.length > 0) {
      pendingUndoRequestRef.current = true;
      setSyncMessage("Applying undo after current throw sync.");
      return;
    }

    if (!gameId) {
      console.warn("Cannot undo: missing gameId");
      return;
    }

    await executeUndo();
  }, [executeUndo, gameId]);

  return {
    handleThrow,
    handleUndo,
    isActionInFlight: false,
    pendingThrowCount,
    isQueueFull: pendingThrowCount >= 3,
    syncMessage,
    clearSyncMessage,
    isUndoInFlight: false,
  };
}
