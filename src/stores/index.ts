// Game state
export {
  $gameData,
  $isLoading,
  $error,
  $activePlayer,
  $currentRound,
  $currentThrowCount,
  $isGameFinished,
  $winnerId,
  $gameSettings,
  $playersForUI,
  setGameData,
  setLoading,
  setError,
  resetGameStore,
} from "./game";

// Room/invitation state
export {
  $currentGameId,
  $invitation,
  $lastFinishedGameId,
  setCurrentGameId,
  setInvitation,
  setLastFinishedGameId,
  getActiveGameId,
  resetRoomStore,
} from "./room";

// Settings wurden entfernt - verwende stattdessen $gameSettings aus game.ts

// UI state
export {
  $isFinishGameOverlayOpen,
  $isSettingsOverlayOpen,
  $isNewPlayerOverlayOpen,
  $activeTab,
  $errorMessage,
  openFinishGameOverlay,
  closeFinishGameOverlay,
  openSettingsOverlay,
  closeSettingsOverlay,
  openNewPlayerOverlay,
  closeNewPlayerOverlay,
  setActiveTab,
  setErrorMessage,
  clearErrorMessage,
} from "./ui";
