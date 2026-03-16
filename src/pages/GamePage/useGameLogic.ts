import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useRoomStream } from "@/shared/hooks/useRoomStream";
import { useGameState } from "./useGameState";
import { useThrowHandler } from "./throws/useThrowHandler";
import { useGameSounds } from "./useGameSounds";
import { useWakeLock } from "./useWakeLock";
import type { GameThrowsResponse, UIPlayer } from "@/types";
import { parseGameIdParam } from "./lib/gameLogic.helpers";
import { useGameExitFlow, useGameSettingsFlow } from "./useGameActions";
import {
  useAutoFinishGame,
  useGameSummaryNavigation,
  useInteractionSoundUnlock,
  useRoomEventRefetch,
} from "./useGamePageEffects";
import { useGamePlayersState } from "./useGamePlayersState";
import { parseLocationState } from "@/lib/router/locationState";

export {
  areAllPlayersAtStartScore,
  parseGameIdParam,
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
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
  handleUndoFromOverlay: () => Promise<void>;
  isExitOverlayOpen: boolean;
  isInteractionDisabled: boolean;
  isLoading: boolean;
  isSavingSettings: boolean;
  isSettingsOpen: boolean;
  isUndoDisabled: boolean;
  pageError: string | null;
  refetch: () => Promise<void>;
  settingsError: string | null;
  shouldShowFinishOverlay: boolean;
}

function isGameLocationState(s: unknown): s is { skipFinishOverlay?: boolean } {
  return typeof s === "object" && s !== null;
}

/**
 * Orchestrates smaller page-specific hooks into the game page contract.
 */
export function useGameLogic(): UseGameLogicResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const gameId = useMemo(() => parseGameIdParam(gameIdParam), [gameIdParam]);

  const { gameData, isLoading, error, refetch, updateGameSettings } = useGameState({ gameId });
  const { handleThrow, handleUndo, isUndoPending } = useThrowHandler({ gameId });
  const { event } = useRoomStream(gameId);
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
    handleUndo,
    isLoading,
    isUndoPending,
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
    updateGameSettings,
  });
  const { handleCloseExitOverlay, handleExitGame, handleOpenExitOverlay, isExitOverlayOpen } =
    useGameExitFlow({
      gameId,
      navigate,
      setPageError,
    });

  useGameSummaryNavigation({ gameData, gameId, navigate });
  useRoomEventRefetch({ event, refetch });
  useAutoFinishGame({
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
    handleThrow,
    handleUndo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleOpenExitOverlay,
    handleCloseExitOverlay,
    clearPageError,
    handleExitGame,
    refetch,
  };
}
