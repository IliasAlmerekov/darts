import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useGameSession } from "./useGameSession";
import { useGameSounds } from "./useGameSounds";
import { useWakeLock } from "./useWakeLock";
import type { GameThrowsResponse, UIPlayer } from "@/types";
import type { SyncStatus } from "./lib/gameSession.logic";
import { useGameExitFlow, useGameSettingsFlow } from "./useGameActions";
import {
  useAutoFinishGame,
  useGameSummaryNavigation,
  useInteractionSoundUnlock,
} from "./useGamePageEffects";
import { useGamePlayersState } from "./useGamePlayersState";
import { parseLocationState } from "@/lib/router/locationState";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";

export {
  areAllPlayersAtStartScore,
  shouldAutoFinishGame,
  shouldNavigateToSummary,
} from "./lib/gameLogic.helpers";

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
  handleOpenExitOverlay: () => void;
  handleOpenSettings: () => void;
  handleSaveSettings: (settings: GameSettingsFormValues) => Promise<void>;
  handleRetry: () => void;
  handleThrow: (value: string | number) => void;
  handleUndo: () => void;
  handleUndoFromOverlay: () => void;
  isExitOverlayOpen: boolean;
  isInteractionDisabled: boolean;
  isLoading: boolean;
  isQueueFull: boolean;
  isSavingSettings: boolean;
  isSettingsOpen: boolean;
  isUndoDisabled: boolean;
  pageError: string | null;
  settingsError: string | null;
  shouldShowFinishOverlay: boolean;
  syncStatus: SyncStatus;
}

function isGameLocationState(s: unknown): s is { skipFinishOverlay?: boolean } {
  return (
    typeof s === "object" &&
    s !== null &&
    (!("skipFinishOverlay" in s) ||
      typeof (s as Record<string, unknown>).skipFinishOverlay === "boolean")
  );
}

/**
 * Orchestrates smaller page-specific hooks into the game page contract.
 */
export function useGameLogic(): UseGameLogicResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const gameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);

  const { view, commands } = useGameSession(gameId);
  const { game: gameData, isLoading, error } = view;
  const isGameActive = gameData?.status === "started";
  const skipFinishOverlay =
    parseLocationState(location.state, isGameLocationState)?.skipFinishOverlay === true;

  useGameSounds(gameData);
  useWakeLock(isGameActive);
  useInteractionSoundUnlock();

  const [pageError, setPageError] = useState<string | null>(null);
  const {
    activePlayer,
    activePlayers,
    finishedPlayers,
    handleContinueGame,
    handleUndoFromOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    shouldShowFinishOverlay,
  } = useGamePlayersState({
    error,
    gameData,
    gameId,
    handleUndo: commands.undo,
    isLoading,
    canThrow: view.canThrow,
    canUndo: view.canUndo,
    skipFinishOverlay,
  });
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
  const { handleCloseExitOverlay, handleExitGame, handleOpenExitOverlay, isExitOverlayOpen } =
    useGameExitFlow({
      gameId,
      navigate,
      setPageError,
    });

  useGameSummaryNavigation({ canFinish: view.canFinish, gameData, gameId, navigate });
  useAutoFinishGame({
    canFinish: view.canFinish,
    gameData,
    gameId,
    navigate,
    setPageError,
    shouldShowFinishOverlay,
  });

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
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    pageError,
    isExitOverlayOpen,
    isQueueFull: view.isQueueFull,
    syncStatus: view.status,
    handleRetry: commands.retry,
    handleThrow: commands.throwDart,
    handleUndo: commands.undo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleOpenExitOverlay,
    handleCloseExitOverlay,
    clearPageError,
    handleExitGame,
  };
}
