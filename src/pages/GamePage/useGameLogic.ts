import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameSession } from "./useGameSession";
import { useGameSounds } from "./useGameSounds";
import { useWakeLock } from "./useWakeLock";
import type { GameThrowsResponse } from "@/shared/api/game";
import type { UIPlayer } from "@/types";
import type { SyncStatus } from "./lib/gameSession.logic";
import { useGameExitFlow, useGameSettingsFlow } from "./useGameActions";
import { useGameSummaryNavigation, useInteractionSoundUnlock } from "./useGamePageEffects";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";

interface GameSettingsFormValues {
  doubleOut: boolean;
  tripleOut: boolean;
}

interface UseGameLogicResult {
  activePlayer: GameThrowsResponse["players"][number] | null;
  activePlayers: UIPlayer[];
  clearPageError: () => void;
  error: Error | null;
  finishedPlayers: UIPlayer[];
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  handleCloseExitOverlay: () => void;
  handleCloseSettings: () => void;
  handleContinueGame: () => void;
  handleExitGame: () => Promise<void>;
  handleFinishGame: () => void;
  handleOpenExitOverlay: () => void;
  handleOpenSettings: () => void;
  handleSaveSettings: (settings: GameSettingsFormValues) => Promise<void>;
  handleRetry: () => void;
  handleThrow: (value: string | number) => void;
  handleUndo: () => void;
  handleUndoFromOverlay: () => void;
  isExitOverlayOpen: boolean;
  isExitPending: boolean;
  isFinishGameDisabled: boolean;
  isFinishPending: boolean;
  finishError: string | null;
  isInteractionDisabled: boolean;
  isLoading: boolean;
  isQueueFull: boolean;
  isSavingSettings: boolean;
  isSettingsDisabled: boolean;
  isSettingsOpen: boolean;
  isUndoDisabled: boolean;
  pageError: string | null;
  settingsError: string | null;
  shouldShowFinishOverlay: boolean;
  syncStatus: SyncStatus;
}

/**
 * Orchestrates smaller page-specific hooks into the game page contract.
 */
export function useGameLogic(): UseGameLogicResult {
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const gameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);

  const { view, commands } = useGameSession(gameId);
  const { game: gameData, isLoading, error } = view;
  const isGameActive = gameData?.status === "started";
  useGameSounds(gameData);
  useWakeLock(isGameActive);
  useInteractionSoundUnlock();

  const [pageError, setPageError] = useState<string | null>(null);
  const {
    activePlayer,
    activePlayers,
    finishedPlayers,
    isInteractionDisabled,
    isSettingsDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
  } = view;
  const {
    handleCloseSettings,
    handleOpenSettings,
    handleSaveSettings,
    isSavingSettings,
    isSettingsOpen,
    settingsError,
  } = useGameSettingsFlow({
    gameData,
    gameId,
    updateGameSettings: commands.updateSettings,
  });
  const {
    handleCloseExitOverlay,
    handleExitGame,
    handleOpenExitOverlay,
    isExitOverlayOpen,
    isExitPending,
  } = useGameExitFlow({
    gameId,
    navigate,
    setPageError,
  });

  useGameSummaryNavigation({ gameId, isFinished: view.isFinished, navigate });

  const clearPageError = useCallback(() => {
    setPageError(null);
  }, []);

  return {
    gameId,
    gameData,
    isLoading,
    error,
    activePlayers,
    finishedPlayers,
    activePlayer,
    shouldShowFinishOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    isSettingsDisabled,
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    pageError,
    isExitOverlayOpen,
    isExitPending,
    isFinishGameDisabled: !view.canFinishGame || view.isFinishPending,
    isFinishPending: view.isFinishPending,
    finishError: view.finishError,
    isQueueFull: view.isQueueFull,
    syncStatus: view.status,
    handleRetry: commands.retry,
    handleThrow: commands.throwDart,
    handleUndo: commands.undo,
    handleContinueGame: commands.continueGame,
    handleUndoFromOverlay: commands.undoFromOverlay,
    handleFinishGame: commands.finishGame,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleOpenExitOverlay,
    handleCloseExitOverlay,
    clearPageError,
    handleExitGame,
  };
}
